import { getGeminiModel } from "./gemini"

/**
 * BDSオークション評価レポートのスクショ解析結果
 * evaluations.photo_analysis に保存し、vehicles 更新・利益シミュレーター初期値に使用
 */
export type PhotoAnalysisResult = {
  vehicleName?: string
  year?: number
  mileage?: string
  overallGrade?: string
  exteriorGrade?: "A" | "B" | "C" | "D" | "E"
  frameGrade?: "A" | "B" | "C" | "D" | "E"
  engineGrade?: "A" | "B" | "C" | "D" | "E"
  /** BDSが指摘している不具合箇所 */
  negativeItems: string[]
  /** 現在価格・即決価格（円） */
  price?: number
  buyNowPrice?: number
  lotNumber?: string
  note?: string
  /** 後方互換用（BDS解析では空） */
  exteriorDamage?: string[]
  engineCorrosion?: string[]
  consumableWear?: string[]
  customParts?: string[]
  highValueEbayParts?: { part: string; reason: string }[]
  riskAreas?: { description: string; imageIndex: number; bbox?: { x: number; y: number; width: number; height: number } }[]
}

const BDS_SCREENSHOT_PROMPT = `あなたは BDS（バイクデータ・システム）オークションの評価レポートを読み取る専門家です。
添付された画像は、BDSオークションの車両評価レポート画面のスクリーンショットです。
複数枚ある場合は、すべて同一台の車両に関するレポートとして統合して解析してください。

## 読み取る項目（判読できる範囲で正確に）
1. **vehicleName**: 車種名（メーカー名 車種名 の形式）
2. **year**: 年式（数値。例: 1998）
3. **mileage**: 走行距離（文字列のまま。例: "12,345 km" または "12345km"）
4. **overallGrade**: 総合評価点（BDSの総合評価。例: "4.5" や "B" など）
5. **exteriorGrade / frameGrade / engineGrade**: 外装・フレーム・エンジンの各部位評価（A〜E）
6. **negativeItems**: BDSが指摘している不具合・要注意箇所のリスト（日本語で簡潔に）
7. **price**: 現在価格（円）。即決価格と別の場合は price に現在価格、buyNowPrice に即決価格
8. **lotNumber**: 出品番号

出力は必ず次の JSON 形式のみにしてください。説明文は不要です。
{
  "vehicleName": "車種名" または null,
  "year": 年式の数値 または null,
  "mileage": "走行距離" または null,
  "overallGrade": "総合評価" または null,
  "exteriorGrade": "A"|"B"|"C"|"D"|"E" または null,
  "frameGrade": "A"|"B"|"C"|"D"|"E" または null,
  "engineGrade": "A"|"B"|"C"|"D"|"E" または null,
  "negativeItems": ["不具合1", "不具合2", ...],
  "price": 現在価格（円の数値） または null,
  "buyNowPrice": 即決価格（円の数値） または null,
  "lotNumber": "出品番号" または null,
  "note": "任意のメモ（判読不能箇所など）" または null
}

判読できない項目は null にしてください。負の項目がなければ negativeItems は空配列 [] にしてください。`

function parseBdsAnalysisJson(text: string): PhotoAnalysisResult {
  const cleaned = text.replace(/```json?\s*/i, "").replace(/```\s*$/i, "").trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  const grades = ["A", "B", "C", "D", "E"] as const
  const grade = (v: unknown): (typeof grades)[number] | undefined =>
    typeof v === "string" && grades.includes(v as (typeof grades)[number])
      ? (v as (typeof grades)[number])
      : undefined
  const negativeItems = Array.isArray(parsed.negativeItems)
    ? (parsed.negativeItems as unknown[]).filter((x) => typeof x === "string").map(String)
    : []
  const year =
    typeof parsed.year === "number" && Number.isFinite(parsed.year)
      ? parsed.year
      : typeof parsed.year === "string"
        ? parseInt(parsed.year.replace(/\D/g, ""), 10) || undefined
        : undefined
  const price =
    typeof parsed.price === "number" && Number.isFinite(parsed.price)
      ? parsed.price
      : typeof parsed.price === "string"
        ? parseInt(parsed.price.replace(/[^0-9]/g, ""), 10) || undefined
        : undefined
  const buyNowPrice =
    typeof parsed.buyNowPrice === "number" && Number.isFinite(parsed.buyNowPrice)
      ? parsed.buyNowPrice
      : typeof parsed.buyNowPrice === "string"
        ? parseInt(parsed.buyNowPrice.replace(/[^0-9]/g, ""), 10) || undefined
        : undefined
  return {
    vehicleName: typeof parsed.vehicleName === "string" && parsed.vehicleName.trim() ? parsed.vehicleName.trim() : undefined,
    year,
    mileage: typeof parsed.mileage === "string" && parsed.mileage.trim() ? parsed.mileage.trim() : undefined,
    overallGrade: typeof parsed.overallGrade === "string" && parsed.overallGrade.trim() ? parsed.overallGrade.trim() : undefined,
    exteriorGrade: grade(parsed.exteriorGrade),
    frameGrade: grade(parsed.frameGrade),
    engineGrade: grade(parsed.engineGrade),
    negativeItems,
    price,
    buyNowPrice,
    lotNumber: typeof parsed.lotNumber === "string" && parsed.lotNumber.trim() ? parsed.lotNumber.trim() : undefined,
    note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : undefined,
    exteriorDamage: [],
    engineCorrosion: [],
    consumableWear: [],
    customParts: [],
    highValueEbayParts: [],
    riskAreas: [],
  }
}

/**
 * BDSオークション評価レポートのスクショを解析。
 * 複数枚の場合は統合して1台分として解析する。
 */
export async function analyzeVehiclePhotosWithGrades(
  images: { base64: string; mimeType: string }[],
  _options?: { focusPoints?: string[] }
): Promise<PhotoAnalysisResult> {
  if (images.length === 0) {
    return {
      negativeItems: [],
      exteriorDamage: [],
      engineCorrosion: [],
      consumableWear: [],
      customParts: [],
      highValueEbayParts: [],
      riskAreas: [],
      note: "画像がありませんでした",
    }
  }

  const model = getGeminiModel()
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const parts: Part[] = [{ text: BDS_SCREENSHOT_PROMPT }]
  parts.push({
    text: `全 ${images.length} 枚のスクリーンショットを確認し、1台分の車両として統合して上記の JSON 形式のみで回答してください。`,
  })
  for (let i = 0; i < images.length; i++) {
    parts.push({ text: `【スクリーンショット ${i + 1}】` })
    parts.push({
      inlineData: {
        mimeType: images[i]!.mimeType || "image/jpeg",
        data: images[i]!.base64,
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

  return parseBdsAnalysisJson(text)
}

/**
 * 後方互換: analyzeVehiclePhotos（実車写真解析）は BDS 解析に置き換え
 */
export async function analyzeVehiclePhotos(images: {
  base64: string
  mimeType: string
}[]): Promise<PhotoAnalysisResult> {
  return analyzeVehiclePhotosWithGrades(images)
}

const STRICT_INSPECTION_PROMPT = `あなたはバイク輸出入のプロ鑑定士です。
オークション出品車両の写真を、買い手目線で厳しくチェックしてください。

出力は必ず次の JSON のみにしてください。
{
  "strictFindings": ["指摘1（修理・交換コスト: ○○円）", "指摘2（コスト: ○○円）", ...],
  "strictRepairCost": 12345
}
strictRepairCost は、すべての指摘に対応する修理・交換にかかる総コスト（円）の合計です。数値のみ。`

export type StrictInspectionResult = {
  strictFindings: string[]
  strictRepairCost: number
}

export async function analyzeStrictInspection(images: {
  base64: string
  mimeType: string
}[]): Promise<StrictInspectionResult> {
  if (images.length === 0) {
    return { strictFindings: [], strictRepairCost: 0 }
  }

  const model = getGeminiModel()
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const parts: Part[] = [{ text: STRICT_INSPECTION_PROMPT }]
  for (let i = 0; i < images.length; i++) {
    parts.push({ text: `【写真 ${i + 1}】` })
    parts.push({
      inlineData: {
        mimeType: images[i]!.mimeType || "image/jpeg",
        data: images[i]!.base64,
      },
    })
  }
  parts.push({ text: "以上です。指定の JSON のみ出力してください。" })

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  })
  const text = result.response.text()
  if (!text) throw new Error("Gemini から応答がありませんでした。")

  const cleaned = text.replace(/```json?\s*/i, "").replace(/```\s*$/i, "").trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  const strictFindings = Array.isArray(parsed.strictFindings)
    ? (parsed.strictFindings as string[]).filter((x) => typeof x === "string")
    : []
  const strictRepairCost =
    typeof parsed.strictRepairCost === "number"
      ? Math.max(0, parsed.strictRepairCost)
      : typeof parsed.strictRepairCost === "string"
        ? Math.max(0, parseInt(parsed.strictRepairCost.replace(/\D/g, ""), 10) || 0)
        : 0
  return { strictFindings, strictRepairCost }
}
