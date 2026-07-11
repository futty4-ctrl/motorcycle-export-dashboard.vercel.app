import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { verifyLineSignature } from "@/lib/buyback/signature"
import { textMessage, replyMessage, getAccessToken, QR_ENGINE, type LineTextMessage } from "@/lib/buyback/line-client"
import { extractFields } from "@/lib/buyback/extract"
import { mergeFields } from "@/lib/buyback/merge"
import { nextHearingPrompt } from "@/lib/buyback/hearing"
import { GREETING, TSUNAGI, HOLDING } from "@/lib/buyback/templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// 注意: 現状は同期処理（Geminiで数秒かかりうる）。将来 next/server の after() で
// 署名検証・dedupe後に即200 → 重い処理を遅延、へ最適化する（§9）。

const TERMINAL = "(completed,declined,lost)"

type Supa = ReturnType<typeof createServerSupabaseClient>

interface LineEvent {
  type?: string
  webhookEventId?: string
  replyToken?: string
  source?: { userId?: string }
  message?: { id?: string; type?: string; text?: string }
}

async function getOrCreateOpenCase(supabase: Supa, lineUserId: string) {
  const { data } = await supabase
    .from("buyback_cases")
    .select("*")
    .eq("line_user_id", lineUserId)
    .not("status", "in", TERMINAL)
    .order("created_at", { ascending: false })
    .limit(1)
  if (data && data.length > 0) return data[0]
  const { data: ins } = await supabase
    .from("buyback_cases")
    .insert({ line_user_id: lineUserId, status: "hearing" })
    .select("*")
    .single()
  return ins
}

async function tryReply(replyToken: string | undefined, messages: LineTextMessage[]): Promise<void> {
  if (!replyToken) return
  try {
    await replyMessage(getAccessToken(), replyToken, messages)
  } catch {
    // トークン未設定/送信失敗でも webhook は 200 を返す
  }
}

async function recordEvent(supabase: Supa, caseId: string | null, type: string, payload: unknown) {
  await supabase.from("buyback_events").insert({ case_id: caseId, type, payload })
}

/** ゲート充足時：pending へ遷移＋つなぎ返信＋LW通知イベント（実送信はWORKS接続後） */
async function toPending(supabase: Supa, caseRow: { id: string; case_no: string }, replyToken?: string) {
  await supabase.from("buyback_cases").update({ status: "pending_valuation" }).eq("id", caseRow.id)
  await tryReply(replyToken, [textMessage(TSUNAGI)])
  await recordEvent(supabase, caseRow.id, "lw_notify_pending", {
    case_no: caseRow.case_no,
    note: "LINE WORKS通知はWORKS接続後に実送信",
  })
}

async function handleText(supabase: Supa, ev: LineEvent, userId: string) {
  const text = ev.message?.text ?? ""
  const c = await getOrCreateOpenCase(supabase, userId)
  if (!c) return

  const newRaw = `${c.raw_hearing_text ?? ""}\n${text}`.trim()
  let extracted = null
  try {
    extracted = await extractFields(text)
  } catch {
    // 抽出失敗 → 原文保存のみ（フォールバック）
  }
  const merged = mergeFields(
    {
      maker: c.maker,
      model: c.model,
      model_year: c.model_year,
      mileage_km: c.mileage_km,
      engine_status: c.engine_status,
      docs_status: c.docs_status,
      note: c.note,
    },
    extracted ?? {}
  )
  await supabase
    .from("buyback_cases")
    .update({ ...merged, raw_hearing_text: newRaw, updated_at: new Date().toISOString() })
    .eq("id", c.id)

  if (c.status === "hearing") {
    const prompt = nextHearingPrompt({
      model: merged.model,
      engine_status: merged.engine_status,
      photo_count: c.photo_count,
    })
    if (prompt) {
      const qr = prompt.quick === "engine" ? QR_ENGINE : undefined
      await tryReply(ev.replyToken, [textMessage(prompt.text, qr)])
    } else {
      await toPending(supabase, c, ev.replyToken)
    }
  } else {
    await tryReply(ev.replyToken, [textMessage(HOLDING)])
    await recordEvent(supabase, c.id, "customer_message_after_pending", { text })
  }
}

async function handleImage(supabase: Supa, ev: LineEvent, userId: string) {
  const c = await getOrCreateOpenCase(supabase, userId)
  if (!c) return
  const msgId = ev.message?.id ?? null

  // TODO: LINE Content API で画像取得 → Supabase Storage(buyback-photos) へ保存し storage_path 更新。
  //       現状は枚数カウントのみ（ゲート判定に必要）。line_message_id で再配送dedupe。
  const { error: pErr } = await supabase
    .from("buyback_photos")
    .insert({ case_id: c.id, line_message_id: msgId, storage_path: null })
  if (!pErr) {
    const newCount = (c.photo_count ?? 0) + 1
    await supabase.from("buyback_cases").update({ photo_count: newCount }).eq("id", c.id)
    c.photo_count = newCount
  }

  if (c.status === "hearing") {
    const prompt = nextHearingPrompt({
      model: c.model,
      engine_status: c.engine_status,
      photo_count: c.photo_count,
    })
    if (!prompt) await toPending(supabase, c, ev.replyToken)
    // 未充足なら写真受領で無理に返信しない（あいさつで案内済み）
  } else {
    await recordEvent(supabase, c.id, "photo_added_after_pending", { count: c.photo_count })
  }
}

/**
 * LINE Messaging API Webhook（買取査定Bot・客側）
 * 署名検証 → dedupe → 会話本流（あいさつ/ヒアリング/つなぎ）→ 200。
 */
export async function POST(request: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) {
    return NextResponse.json({ ok: false, error: "LINE_CHANNEL_SECRET 未設定" }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-line-signature")
  if (!verifyLineSignature(channelSecret, rawBody, signature)) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let payload: { events?: unknown[] }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new NextResponse("Bad Request", { status: 400 })
  }
  const events = Array.isArray(payload.events) ? (payload.events as LineEvent[]) : []
  const supabase = createServerSupabaseClient()

  for (const ev of events) {
    const eventId = ev.webhookEventId ?? null
    const userId = ev.source?.userId ?? null

    // dedupe（external_event_id UNIQUE）。再配送は二重処理しない
    const { error: insErr } = await supabase
      .from("buyback_events")
      .insert({ type: "webhook_received", external_event_id: eventId, payload: ev })
    if (insErr) {
      if ((insErr as { code?: string }).code === "23505") continue
      continue // その他エラーは webhook を落とさず次へ
    }

    try {
      if (ev.type === "follow" && ev.replyToken) {
        await tryReply(ev.replyToken, [textMessage(GREETING)])
      } else if (ev.type === "message" && userId) {
        if (ev.message?.type === "text") await handleText(supabase, ev, userId)
        else if (ev.message?.type === "image") await handleImage(supabase, ev, userId)
      }
    } catch {
      // 個別イベントの失敗で webhook 全体を落とさない
    }
  }

  return NextResponse.json({ ok: true })
}
