// ヒアリング：Gemini抽出結果のパース＋査定移行ゲート（純ロジック・仕様書 §5）

export interface ExtractedFields {
  maker: string | null
  model: string | null
  model_year: string | null
  mileage_km: number | null
  engine_status: string | null // かかる / かからない / 不明
  docs_status: string | null // あり / なし / 不明
  note: string | null
}

/** Geminiへ渡すsystem指示（抽出のみ・推測禁止・JSON以外出力禁止） */
export const EXTRACTION_PROMPT = `あなたはバイク買取の受付です。客のメッセージから下記をJSONで抽出してください。
- 推測で埋めない。不明な項目は null。
- 車種の表記ゆれ（モンキー/Monkey、ダックス/Dax 等）は日本語カタカナに正規化。
- engine_status は「かかる」「かからない」「不明」のいずれか。
- docs_status は「あり」「なし」「不明」のいずれか。
- mileage_km は数値のみ（例: 1.2万km → 12000）。
- JSON以外は一切出力しない。
出力形式: {"maker":null,"model":null,"model_year":null,"mileage_km":null,"engine_status":null,"docs_status":null,"note":null}`

function stripFence(s: string): string {
  return s
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()
}

const asStr = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null

const asNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v)
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.]/g, "")
    if (cleaned === "") return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  return null
}

/** Geminiの応答テキストを安全にパース。失敗時は null（呼び出し側は raw_hearing_text 保存にフォールバック） */
export function parseExtraction(text: string): ExtractedFields | null {
  try {
    const obj = JSON.parse(stripFence(text)) as Record<string, unknown>
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return null
    return {
      maker: asStr(obj.maker),
      model: asStr(obj.model),
      model_year: asStr(obj.model_year),
      mileage_km: asNum(obj.mileage_km),
      engine_status: asStr(obj.engine_status),
      docs_status: asStr(obj.docs_status),
      note: asStr(obj.note),
    }
  } catch {
    return null
  }
}

export interface ValuationGateInput {
  model?: string | null
  photoCount?: number
  engineStatus?: string | null
}

/**
 * pending_valuation へ進める条件（§5-1）：
 * 車種判明 かつ 写真1枚以上 かつ 始動の回答あり（「不明」も回答とみなす）。
 */
export function isReadyForValuation(f: ValuationGateInput): boolean {
  const hasModel = !!(f.model && f.model.trim())
  const hasPhoto = (f.photoCount ?? 0) >= 1
  const answeredEngine = !!(f.engineStatus && f.engineStatus.trim())
  return hasModel && hasPhoto && answeredEngine
}
