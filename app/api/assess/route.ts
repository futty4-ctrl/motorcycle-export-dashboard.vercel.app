import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY が設定されていません" },
        { status: 503 }
      )
    }
    const client = new Anthropic({ apiKey })
    const { image, mediaType } = await req.json()

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/png",
                data: image,
              },
            },
            {
              type: "text",
              text: `あなたはバイク仕入れのプロです。このBDS個票画像を解析して、以下のJSON形式のみで返してください。余計な説明は不要です。

{
  "bike_name": "車種名（メーカー＋車名）",
  "chassis_number": "車台番号",
  "year": "初年度",
  "mileage": "走行距離（例: 6,997km）",
  "color": "色",
  "displacement": "排気量",
  "parts": "パーツ有無",
  "auction_price": 落札価格（数値のみ。円マークなし）,
  "engine_status": "エンジン状態（例: エンジン不動・電装系不良など）",
  "damage_summary": "外装・各部ダメージの要約（2〜3文）",
  "total_cost_min": 総仕入れコスト最小値（仕入れ＋修理費＋陸送の合計・数値のみ）,
  "total_cost_max": 総仕入れコスト最大値（数値のみ）,
  "sell_price_min": 想定売却価格最小値（ヤフオク国内＋eBay輸出を考慮・数値のみ）,
  "sell_price_max": 想定売却価格最大値（数値のみ）,
  "profit_min": 粗利最小値（数値のみ）,
  "profit_max": 粗利最大値（数値のみ）,
  "verdict": "GO または NG または CAUTION",
  "verdict_reason": "判定理由（1文・簡潔に）",
  "bid_limit": 推奨入札上限価格（数値のみ）
}

判定基準：
- GO: 粗利見込み2万円以上・エンジン正常
- CAUTION: 粗利1〜2万円 または 軽微な問題あり
- NG: 修理費が売値を上回る・エンジン不動で採算が合わない

JSONのみ返すこと。バッククォートや説明文は不要。`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    console.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "査定エラー" },
      { status: 500 }
    )
  }
}
