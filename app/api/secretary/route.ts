import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { type, content, date } = await req.json()

    const supabase = createServerSupabaseClient()

    // 今日のログを全部取得してコンテキストに使う
    const { data: recentLogs } = await supabase
      .from("secretary_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    const recentContext = recentLogs
      ?.map((l) => `[${l.date}] ${l.type}: ${l.content}`)
      .join("\n") ?? ""

    const systemPrompt = `あなたは合同会社JFPバイク事業部の優秀なビジネス秘書AIです。
社長はふっちー（大阪府堺市在住）。

【事業概要】
- BDSオークション（大阪・関東・九州）でバイクを仕入れ、ヤフオクで販売
- 月30〜40台・粗利¥150万目標
- メイン車種：ネイキッド・オフ車・4ミニ（ゴリラ・モンキー・エイプ）・アドレスV125
- 仕入上限：15万円以内
- 将来：東南アジア・欧米への輸出、事業拡大

【あなたの役割】
- 社長の振り返りを深く理解し、具体的で実践的なアイデアを提案する
- 数字・行動・改善点を明確に指摘する
- バイク事業だけでなく、新しいビジネスの可能性も視野に入れてアドバイスする
- 短く・鋭く・行動につながる提案をする

【最近のログ】
${recentContext || "（まだログなし）"}`

    let userMessage = ""
    if (type === "memo") {
      userMessage = `社長からのメモ・アイデアです：\n\n${content}\n\nこれについて深掘りして、具体的なアクションや可能性を提案してください。`
    } else if (type === "review") {
      userMessage = `本日（${date}）の振り返りです：\n\n${content}\n\nこの振り返りを分析して、\n① 良かった点の強化策\n② 改善すべき点の具体的な対処法\n③ 明日取り組むべき優先アクション3つ\n④ この状況から見えてくる新しいビジネスチャンス\nをそれぞれ提案してください。`
    } else {
      userMessage = content
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: userMessage }],
      system: systemPrompt,
    })

    const aiResponse = message.content[0].type === "text" ? message.content[0].text : ""

    // Supabaseに保存
    await supabase.from("secretary_logs").insert({
      date: date ?? new Date().toISOString().slice(0, 10),
      type,
      content,
      ai_response: aiResponse,
    })

    return NextResponse.json({ success: true, response: aiResponse })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラーが発生しました"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("secretary_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ success: true, logs: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "取得失敗"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
