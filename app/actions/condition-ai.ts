"use server"

import { getGeminiModel } from "@/lib/ai/gemini"
import { resizeImageForAnalysis } from "@/lib/image-resize"

export type ConditionAiResult = {
  rank: "A" | "B" | "C" | "D"
  repairCostEstimate: number
  reasoning: string
  negativeItems: string[]
}

const RANK_PROMPT = `あなたはバイク査定のプロです。添付された写真（同一車両の複数角度）から、この車両の状態ランクを判定してください。

## 状態ランク基準
- **A**: 美品・極上。ほぼ新品同様、外装キズほぼなし、エンジン好調の見込み。整備費¥0
- **B**: 良好。小傷あるが使用感少ない。エンジン始動確認が取れそう。整備費¥10,000程度
- **C**: 並品。使用感あり、外装に傷/汚れ、細部にダメージ。整備費¥30,000程度
- **D**: 不良。不動、大きな外装ダメージ、部品取り相当。整備費¥60,000以上

## 出力（JSONのみ返す、コードブロック禁止）
{
  "rank": "A" | "B" | "C" | "D",
  "repairCostEstimate": 整備費の見積もり（円、数値）,
  "reasoning": "判定理由（1-2文）",
  "negativeItems": ["傷・不具合の指摘", ...]
}`

/**
 * 写真から状態ランク（A/B/C/D）と整備費見積を判定
 */
export async function analyzeCondition(
  images: { base64: string; mimeType: string }[]
): Promise<{
  success: boolean
  error?: string
  result?: ConditionAiResult
}> {
  try {
    if (images.length === 0) {
      return { success: false, error: "画像が指定されていません" }
    }

    // 画像リサイズ
    const resized = await Promise.all(
      images.map(async (img) => {
        const r = await resizeImageForAnalysis(img.base64, img.mimeType)
        return { base64: r.base64, mimeType: r.mimeType }
      })
    )

    const model = getGeminiModel()
    const parts = [
      { text: RANK_PROMPT },
      ...resized.map((img) => ({
        inlineData: { data: img.base64, mimeType: img.mimeType },
      })),
    ]

    const response = await model.generateContent(parts)
    const text = response.response.text().trim()
    // コードブロックが混じっても取り除く
    const json = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()
    const parsed = JSON.parse(json) as ConditionAiResult

    if (!["A", "B", "C", "D"].includes(parsed.rank)) {
      throw new Error("ランク判定結果が不正です")
    }

    return {
      success: true,
      result: {
        rank: parsed.rank,
        repairCostEstimate: Math.round(parsed.repairCostEstimate ?? 0),
        reasoning: parsed.reasoning ?? "",
        negativeItems: Array.isArray(parsed.negativeItems)
          ? parsed.negativeItems
          : [],
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI判定に失敗しました"
    return { success: false, error: message }
  }
}
