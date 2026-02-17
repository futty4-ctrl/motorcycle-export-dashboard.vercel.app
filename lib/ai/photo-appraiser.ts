/**
 * AI査定エンジン: バイクの生写真から車種・コンディション・相場を鑑定し、
 * 利益シミュレーターの初期値に使うための解析
 */

import { getGeminiModel } from "./gemini"
import { resizeImageForAnalysis } from "@/lib/image-resize"

export type PhotoAppraisalResult = {
  modelName: string
  modelType: string
  confidence: "high" | "medium" | "low"
  customParts: { part: string; brand?: string }[]
  exteriorCondition: number
  estimatedDomesticJpy: number
  estimatedExportUsd: number
  note?: string
}

const APPRAISER_PROMPT = `あなたはバイク輸出入のプロ鑑定士です。添付された写真はすべて**同一台のバイク**の複数角度（フロント・リア・エンジン・メーター等）です。これらを1台として総合的にBDS査定し、以下の情報を鑑定してください。

## 出力項目
1. **車種名と型式**: 可能な範囲で特定し、確信度（high / medium / low）も付けてください。
2. **カスタムパーツの有無とブランド**: 純正以外のパーツがあればパーツ名とブランド（分かる場合）を列挙してください。
3. **外装コンディション**: 5段階評価（1=不良・5=良）で付けてください。
4. **推定落札相場**:
   - 日本国内のオークション落札相場の目安（円）
   - 海外輸出時の想定売却相場（USD）

出力は必ず次の JSON 形式のみにしてください。説明文は不要です。
{
  "modelName": "車種名（例: ホンダ モンキー）",
  "modelType": "型式（例: Z50J）",
  "confidence": "high" | "medium" | "low",
  "customParts": [{"part": "パーツ名", "brand": "ブランド名（不明なら省略可）"}],
  "exteriorCondition": 1〜5の整数,
  "estimatedDomesticJpy": 日本国内推定落札相場（円の数値）,
  "estimatedExportUsd": 海外輸出推定相場（USDの数値）,
  "note": "任意のメモ（省略可）"
}`

function parseAppraisalJson(text: string): PhotoAppraisalResult {
  const cleaned = text.replace(/```json?\s*/i, "").replace(/```\s*$/i, "").trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  const modelName = typeof parsed.modelName === "string" ? parsed.modelName : ""
  const modelType = typeof parsed.modelType === "string" ? parsed.modelType : ""
  const confidence =
    parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
      ? parsed.confidence
      : "medium"
  const customParts = Array.isArray(parsed.customParts)
    ? (parsed.customParts as unknown[]).map((x) => {
        const o = x as Record<string, unknown>
        return {
          part: typeof o.part === "string" ? o.part : "",
          brand: typeof o.brand === "string" ? o.brand : undefined,
        }
      })
    : []
  const exteriorCondition =
    typeof parsed.exteriorCondition === "number" && parsed.exteriorCondition >= 1 && parsed.exteriorCondition <= 5
      ? Math.round(parsed.exteriorCondition)
      : 3
  const estimatedDomesticJpy =
    typeof parsed.estimatedDomesticJpy === "number"
      ? Math.max(0, Math.round(parsed.estimatedDomesticJpy))
      : typeof parsed.estimatedDomesticJpy === "string"
        ? Math.max(0, parseInt(parsed.estimatedDomesticJpy.replace(/\D/g, ""), 10) || 0)
        : 0
  const estimatedExportUsd =
    typeof parsed.estimatedExportUsd === "number"
      ? Math.max(0, Math.round(parsed.estimatedExportUsd * 100) / 100)
      : typeof parsed.estimatedExportUsd === "string"
        ? Math.max(0, parseFloat(parsed.estimatedExportUsd.replace(/[^0-9.]/g, "")) || 0)
        : 0
  const note = typeof parsed.note === "string" ? parsed.note : undefined
  return {
    modelName,
    modelType,
    confidence,
    customParts,
    exteriorCondition,
    estimatedDomesticJpy,
    estimatedExportUsd,
    note,
  }
}

/**
 * バイクの生写真を解析し、車種・コンディション・推定相場を返す。
 * 利益シミュレーターの初期値（入札上限・ヤフオク予想・eBay予想）に利用可能。
 */
export async function analyzeRawPhotosForAppraisal(images: {
  base64: string
  mimeType: string
}[]): Promise<PhotoAppraisalResult> {
  if (images.length === 0) {
    return {
      modelName: "",
      modelType: "",
      confidence: "low",
      customParts: [],
      exteriorCondition: 3,
      estimatedDomesticJpy: 0,
      estimatedExportUsd: 0,
      note: "写真がありませんでした",
    }
  }

  const model = getGeminiModel()
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const parts: Part[] = [{ text: APPRAISER_PROMPT }]
  parts.push({
    text: `全 ${images.length} 枚の写真は同一台のバイクです。フロント・リア・エンジン・メーター等を総合して、上記の JSON 形式のみで回答してください。`,
  })
  for (let i = 0; i < images.length; i++) {
    parts.push({ text: `【写真 ${i + 1}】` })
    parts.push({
      inlineData: {
        mimeType: images[i].mimeType || "image/jpeg",
        data: images[i].base64,
      },
    })
  }
  parts.push({ text: "以上です。指定の JSON のみ出力してください。" })

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  })
  const response = result.response
  const text = response.text()
  if (!text) throw new Error("Gemini から応答がありませんでした。")

  return parseAppraisalJson(text)
}

/**
 * 画像をリサイズしてから鑑定（API から呼ぶ用）
 */
export async function analyzeRawPhotosForAppraisalWithResize(images: {
  base64: string
  mimeType: string
}[]): Promise<PhotoAppraisalResult> {
  if (images.length === 0) return analyzeRawPhotosForAppraisal([])
  const optimized = await Promise.all(
    images.map((img) => resizeImageForAnalysis(img.base64, img.mimeType))
  )
  return analyzeRawPhotosForAppraisal(optimized)
}
