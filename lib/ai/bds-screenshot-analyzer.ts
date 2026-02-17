import { getGeminiModel } from "./gemini"

export type BdsScreenshotExtract = {
  lotNumber: string | null
  vehicleName: string | null
  modelYear: string | null
  displacement: string | null
  frameNumber: string | null
  overallGrade: string | null
  engineGrade: string | null
  frameGrade: string | null
  electricGrade: string | null
  legGrade: string | null
  exteriorGrade: string | null
  specialNotes: string | null
}

const BDS_SINGLE_PROMPT = `あなたは日本のバイクオークション「BDS」の画面解析の専門家です。
提供されたスクリーンショット画像から、以下の情報を正確に読み取り、指定されたJSON形式のみで出力してください。
画像内のテキストが不鮮明な場合は、無理に推測せず null または空文字としてください。

【抽出項目】
- lotNumber (出品番号: 数字)
- vehicleName (車種名)
- modelYear (年式)
- displacement (排気量)
- frameNumber (車体番号)
- overallGrade (総合評価点: 例 "4", "R" など)
- engineGrade (エンジン評価)
- frameGrade (フレーム評価)
- electricGrade (電装評価)
- legGrade (足回り評価)
- exteriorGrade (外装評価)
- specialNotes (特記事項/検査員コメント: 複数行のテキストをまとめて抽出)

【出力形式】
\`\`\`json
{
  "lotNumber": "...",
  "vehicleName": "...",
  "modelYear": "...",
  "displacement": "...",
  "frameNumber": "...",
  "overallGrade": "...",
  "engineGrade": "...",
  "frameGrade": "...",
  "electricGrade": "...",
  "legGrade": "...",
  "exteriorGrade": "...",
  "specialNotes": "..."
}
\`\`\`
`

const BDS_MULTI_INTRO = `あなたは日本のバイクオークション「BDS」の画面解析の専門家です。

提供された複数の画像は、1つのバイクオークション詳細ページを分割して撮影したものです。画像1、画像2、画像3（もしあれば）の内容をすべて確認し、情報を統合して1つのJSONデータを作成してください。車種名が画像1にあり、検査コメントが画像3にある場合でも、漏らさず抽出してください。

複数画像で同じ項目が重複して写っている場合（のりしろ部分）は、内容が一致するものを1つにマージし、矛盾がある場合はより詳細・正確な方を採用してください。画像内のテキストが不鮮明な場合は、無理に推測せず null または空文字としてください。

【抽出項目】
- lotNumber (出品番号: 数字)
- vehicleName (車種名)
- modelYear (年式)
- displacement (排気量)
- frameNumber (車体番号)
- overallGrade (総合評価点: 例 "4", "R" など)
- engineGrade (エンジン評価)
- frameGrade (フレーム評価)
- electricGrade (電装評価)
- legGrade (足回り評価)
- exteriorGrade (外装評価)
- specialNotes (特記事項/検査員コメント: 複数行をまとめて抽出)

【出力形式】
\`\`\`json
{
  "lotNumber": "...",
  "vehicleName": "...",
  "modelYear": "...",
  "displacement": "...",
  "frameNumber": "...",
  "overallGrade": "...",
  "engineGrade": "...",
  "frameGrade": "...",
  "electricGrade": "...",
  "legGrade": "...",
  "exteriorGrade": "...",
  "specialNotes": "..."
}
\`\`\`
`

function toStr(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

function parseResponse(text: string): BdsScreenshotExtract {
  const cleaned = text.replace(/```json?\s*/i, "").replace(/```\s*$/i, "").trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  return {
    lotNumber: toStr(parsed.lotNumber),
    vehicleName: toStr(parsed.vehicleName),
    modelYear: toStr(parsed.modelYear),
    displacement: toStr(parsed.displacement),
    frameNumber: toStr(parsed.frameNumber),
    overallGrade: toStr(parsed.overallGrade),
    engineGrade: toStr(parsed.engineGrade),
    frameGrade: toStr(parsed.frameGrade),
    electricGrade: toStr(parsed.electricGrade),
    legGrade: toStr(parsed.legGrade),
    exteriorGrade: toStr(parsed.exteriorGrade),
    specialNotes: toStr(parsed.specialNotes),
  }
}

/**
 * 1枚の画像から BDS 情報を抽出する
 */
export async function analyzeBdsScreenshot(image: {
  base64: string
  mimeType: string
}): Promise<BdsScreenshotExtract> {
  const model = getGeminiModel()
  const parts: (
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  )[] = [
    { text: BDS_SINGLE_PROMPT },
    { text: "上記のスクリーンショット画像から、指定のJSON形式のみで回答してください。説明文は不要です。" },
    {
      inlineData: {
        mimeType: image.mimeType || "image/jpeg",
        data: image.base64,
      },
    },
  ]

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  })
  const text = result.response.text()
  if (!text) throw new Error("Gemini から応答がありませんでした。")
  return parseResponse(text)
}

const MAX_IMAGES = 3

/**
 * 複数画像（同一BDSページの分割スクショ）を統合して1つの車両データを抽出する
 */
export async function analyzeBdsScreenshotMultiple(images: {
  base64: string
  mimeType: string
}[]): Promise<BdsScreenshotExtract> {
  const list = images.slice(0, MAX_IMAGES)
  if (list.length === 0) throw new Error("画像がありません。")
  if (list.length === 1) return analyzeBdsScreenshot(list[0])

  const model = getGeminiModel()
  const parts: (
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  )[] = [{ text: BDS_MULTI_INTRO }]
  parts.push({
    text: `全 ${list.length} 枚の画像を確認し、統合した1つのJSON形式のみで回答してください。説明文は不要です。`,
  })
  for (let i = 0; i < list.length; i++) {
    parts.push({ text: `【画像 ${i + 1}】` })
    parts.push({
      inlineData: {
        mimeType: list[i].mimeType || "image/jpeg",
        data: list[i].base64,
      },
    })
  }
  parts.push({ text: "以上です。統合した指定のJSONのみ出力してください。" })

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  })
  const text = result.response.text()
  if (!text) throw new Error("Gemini から応答がありませんでした。")
  return parseResponse(text)
}
