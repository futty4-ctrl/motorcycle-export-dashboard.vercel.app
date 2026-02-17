import { getGeminiModel } from "./gemini"
import {
  estimateRepairCostFromDefects,
  type DefectCategory,
} from "@/lib/repair-master"

/** BDS 査定結果（AI 出力 + マスターから算出した修理費） */
export type BDSEvaluationResult = {
  /** 不具合・ネガティブ項目のリスト（AI が特定） */
  negativeItems: string[]
  /** 修理費概算（円）マスターから算出 */
  repairCostEstimate: number
  /** 内訳（カテゴリ別） */
  repairBreakdown: { category: DefectCategory; label: string; cost: number }[]
  /** AI の生のメモ（任意） */
  rawNote?: string
}

const BDS_SYSTEM_PROMPT = `あなたはバイクの BDS（査定）検査表を読む専門家です。
検査表のテキストまたは画像から、不具合・傷・劣化・要修理と判断できる項目をすべて抽出し、簡潔な日本語ラベルで列挙してください。
出力は必ず次の JSON 形式のみにしてください。説明文は不要です。
{"negative_items": ["ラベル1", "ラベル2", ...]}

例: {"negative_items": ["エンジンオイル微量漏れ", "フロントブレーキパッド摩耗", "フレーム錆"]}
複数ある場合はすべて列挙してください。不具合が一つもない場合は {"negative_items": []} と出力してください。`

/**
 * BDS 検査表（テキストまたは画像）を AI に投げ、不具合箇所を特定し、
 * マスターデータから修理費を概算する
 */
export async function evaluateBDS(input: {
  /** BDS 検査表のテキスト */
  text?: string
  /** BDS 検査表の画像（base64）。テキストと両方ある場合は両方渡す */
  imageBase64?: string
  imageMimeType?: string
}): Promise<BDSEvaluationResult> {
  const model = getGeminiModel()

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const parts: Part[] = []
  parts.push({ text: BDS_SYSTEM_PROMPT })
  if (input.text) {
    parts.push({
      text: `以下が BDS 検査表のテキストです。\n\n${input.text}`,
    })
  }
  if (input.imageBase64) {
    parts.push({
      text: "以下が BDS 検査表の画像です。",
    })
    parts.push({
      inlineData: {
        mimeType: input.imageMimeType ?? "image/jpeg",
        data: input.imageBase64,
      },
    })
  }
  if (!input.text && !input.imageBase64) {
    throw new Error("BDS のテキストまたは画像のいずれかを指定してください。")
  }
  parts.push({
    text: "上記から不具合項目を抽出し、指定の JSON のみ出力してください。",
  })

  const result = await model.generateContent({ contents: [{ role: "user", parts }] })
  const response = result.response
  const text = response.text()
  if (!text) {
    throw new Error("Gemini から応答がありませんでした。")
  }

  const parsed = parseJsonNegativeItems(text)
  const labels = parsed.negative_items ?? []
  const { total, breakdown } = estimateRepairCostFromDefects(labels)

  return {
    negativeItems: labels,
    repairCostEstimate: total,
    repairBreakdown: breakdown,
    rawNote: parsed.raw_note,
  }
}

/** 応答テキストから negative_items をパース（JSON ブロックを探す） */
function parseJsonNegativeItems(text: string): {
  negative_items: string[]
  raw_note?: string
} {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { negative_items: [] }
  }
  try {
    const obj = JSON.parse(jsonMatch[0]) as {
      negative_items?: string[]
      raw_note?: string
    }
    const items = Array.isArray(obj.negative_items)
      ? obj.negative_items.filter((x) => typeof x === "string")
      : []
    return { negative_items: items, raw_note: obj.raw_note }
  } catch {
    return { negative_items: [] }
  }
}
