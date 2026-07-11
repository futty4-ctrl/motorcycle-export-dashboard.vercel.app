import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { verifyLineSignature } from "@/lib/buyback/signature"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TERMINAL = "(completed,declined,lost)"

/**
 * LINE Messaging API Webhook（買取査定Bot・客側）
 * PR1: 署名検証 → イベントを buyback_events に記録（external_event_id で dedupe）
 *      → 新規ユーザーなら hearing 案件を1件作成 → 即 200。
 * 会話フロー・Gemini抽出・返信は PR2。
 */
export async function POST(request: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) {
    return NextResponse.json({ ok: false, error: "LINE_CHANNEL_SECRET 未設定" }, { status: 500 })
  }

  // 署名はリクエストの生ボディに対して検証する
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
  const events = Array.isArray(payload.events) ? payload.events : []

  const supabase = createServerSupabaseClient()

  for (const raw of events) {
    const ev = raw as {
      webhookEventId?: string
      type?: string
      source?: { userId?: string; type?: string }
    }
    const eventId = ev.webhookEventId ?? null
    const lineUserId = ev.source?.userId ?? null

    // dedupe: external_event_id UNIQUE。既に記録済み(23505)ならスキップ
    const { error: insErr } = await supabase.from("buyback_events").insert({
      type: "webhook_received",
      external_event_id: eventId,
      payload: ev,
    })
    if (insErr) {
      if ((insErr as { code?: string }).code === "23505") continue // 再配送 → 二重処理しない
      // その他のエラーは webhook 全体を落とさず次イベントへ（LINE の再送嵐を避ける）
      continue
    }

    // PR1: 新規ユーザーには hearing 案件を1件だけ用意（本格ヒアリングは PR2）
    if (lineUserId) {
      const { data: open } = await supabase
        .from("buyback_cases")
        .select("id")
        .eq("line_user_id", lineUserId)
        .not("status", "in", TERMINAL)
        .limit(1)
      if (!open || open.length === 0) {
        await supabase.from("buyback_cases").insert({
          line_user_id: lineUserId,
          status: "hearing",
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
