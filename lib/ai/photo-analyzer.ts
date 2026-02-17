import { getGeminiModel } from "./gemini"
import { FOURMINI_EXPERT_PROFILE } from "./4mini-expert-profile"

/** オークション写真一括解析の結果（evaluations.photo_analysis に保存する形） */
export type PhotoAnalysisResult = {
  exteriorDamage: string[]
  engineCorrosion: string[]
  consumableWear: string[]
  customParts: string[]
  highValueEbayParts: { part: string; reason: string }[]
  note?: string
  /** 外装・フレーム・エンジンの A〜E 評価 */
  exteriorGrade?: "A" | "B" | "C" | "D" | "E"
  frameGrade?: "A" | "B" | "C" | "D" | "E"
  engineGrade?: "A" | "B" | "C" | "D" | "E"
  /** 見落としがちなリスク箇所。imageIndex は 1 始まり。bbox は正規化座標 (0〜1) で異常箇所の範囲 */
  riskAreas?: {
    description: string
    imageIndex: number
    bbox?: { x: number; y: number; width: number; height: number }
  }[]
}

const GRADE_PROMPT = `${FOURMINI_EXPERT_PROFILE}

## 今回のタスク
複数枚の車両写真を一括で確認し、以下を日本語で出力してください。

### 解像度・品質ルール（厳守）
- 写真が**不鮮明・解像度が低い**場合、推測で評価しないでください。該当する写真番号について、note に「写真N: 不鮮明のため要再確認」と明記し、riskAreas に { "description": "写真N: 解像度不足のため要再確認", "imageIndex": N } を追加してください。断定できない項目は空にせず「要再確認」と正直に報告すること。

### 重点ズーム解析（素人が見落とす箇所を徹底チェック）
以下の箇所は買い手が後からクレームになりやすいため、特に注意して確認し、異常・疑いがあれば必ず riskAreas に bbox 付きで記載してください。
- **ボルトの頭**: 錆・なめ・欠け・メッキ剥がれ
- **ワイヤーの取り回し**: 断線・ほつれ・不自然な配線・テープ巻き
- **オイルパン底面**: 打ち痕・サビ・オイル漏れ
- **フレーム接合部・溶接部**: ひび・錆・補修痕
- **キャブ周り**: 汚れ・サビ・ガスケット滲み

1. **外装・フレーム・エンジンの状態**: それぞれ A〜E で評価（A=良、E=要修理・不良）。不鮮明で判断できない場合は「要再確認」を note に書く。
2. **外装の傷**: タンク・フェンダー・カウル・マフラー等のキズ・へこみ・塗装剥がれ・錆
3. **エンジンの腐食**: エンジン本体・排気管・ヘッドカバー等の錆・腐食・オイル漏れ・カーボン付着
4. **消耗品の減り**: タイヤ溝・ブレーキパッド・チェーン・スプロケット・バッテリー等の摩耗・劣化
5. **カスタムパーツの有無**: 純正以外のパーツがあれば具体的に
6. **見落としがちなリスク箇所**: 上記重点箇所を含め、サビ・漏れ・凹み・ひび等。該当する写真の番号（1始まり）を imageIndex で指定し、description に簡潔な説明を書いてください。異常が写っている画像内の位置を正規化座標（0〜1）で bbox に含めてください。bbox は { "x": 左上X, "y": 左上Y, "width": 幅, "height": 高さ } で、画像幅・高さに対する比率です。
7. **eBayで需要が高いパーツ**: 海外で人気のモデルやレアパーツ、状態の良い純正部品。part と reason をセットで。

出力は必ず次の JSON 形式のみにしてください。説明文は不要です。
{
  "exteriorGrade": "A"|"B"|"C"|"D"|"E",
  "frameGrade": "A"|"B"|"C"|"D"|"E",
  "engineGrade": "A"|"B"|"C"|"D"|"E",
  "exteriorDamage": ["項目1"],
  "engineCorrosion": ["項目1"],
  "consumableWear": ["項目1"],
  "customParts": ["項目1"],
  "riskAreas": [{"description": "箇所の説明（例：エンジン下部：オイル滲みの疑い）", "imageIndex": 1, "bbox": {"x": 0.2, "y": 0.3, "width": 0.25, "height": 0.2}}],
  "highValueEbayParts": [{"part": "パーツ名", "reason": "理由"}],
  "note": "任意のメモ"
}`

const SYSTEM_PROMPT = `${FOURMINI_EXPERT_PROFILE}

## 今回のタスク
複数枚の車両写真を一括で確認し、以下を日本語でリスト化してください。

**解像度ルール**: 写真が不鮮明・低解像度の場合は推測せず、note に「不鮮明のため要再確認」と正直に記載してください。

1. **外装の傷**: タンク・フェンダー・カウル・マフラー等のキズ・へこみ・塗装剥がれ・錆
2. **エンジンの腐食**: エンジン本体・排気管・ヘッドカバー等の錆・腐食・オイル漏れ・カーボン付着
3. **消耗品の減り**: タイヤ溝・ブレーキパッド・チェーン・スプロケット・バッテリー等の摩耗・劣化
4. **カスタムパーツの有無**: 純正以外のパーツ（マフラー・ハンドル・シート・ホイール・サスペンション等）があれば具体的に
5. **eBayで高値で売れそうなパーツ**: 海外で人気のモデルやレアパーツ、状態の良い純正部品など。該当するものがあれば「パーツ名」と「理由（なぜ高値で売れそうか）」をセットで列挙し、特に強調して教えてください。該当がなければ空配列にしてください。

出力は必ず次の JSON 形式のみにしてください。説明文は不要です。
{
  "exteriorDamage": ["項目1", "項目2"],
  "engineCorrosion": ["項目1"],
  "consumableWear": ["項目1"],
  "customParts": ["項目1"],
  "highValueEbayParts": [{"part": "パーツ名", "reason": "高値で売れそうな理由"}],
  "note": "任意のメモ"
}`

/**
 * 複数枚の車両写真を Gemini Vision に渡し、外装・エンジン・消耗品・カスタム・eBay高値パーツを解析する
 */
export async function analyzeVehiclePhotos(images: {
  base64: string
  mimeType: string
}[]): Promise<PhotoAnalysisResult> {
  if (images.length === 0) {
    return {
      exteriorDamage: [],
      engineCorrosion: [],
      consumableWear: [],
      customParts: [],
      highValueEbayParts: [],
      note: "写真がありませんでした",
    }
  }

  const model = getGeminiModel()
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const parts: Part[] = [{ text: SYSTEM_PROMPT }]
  parts.push({
    text: `全 ${images.length} 枚の写真を確認し、上記の JSON 形式のみで回答してください。`,
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

  return parsePhotoAnalysisJson(text)
}

/**
 * 外装・フレーム・エンジン A〜E 評価とリスク箇所（写真番号付き）を含む拡張解析。
 * focusPoints を渡すと、過去の Bad Case から得た「重点チェック項目」をプロンプトに追加する。
 */
export async function analyzeVehiclePhotosWithGrades(
  images: { base64: string; mimeType: string }[],
  options?: { focusPoints?: string[] }
): Promise<PhotoAnalysisResult> {
  if (images.length === 0) {
    return {
      exteriorDamage: [],
      engineCorrosion: [],
      consumableWear: [],
      customParts: [],
      highValueEbayParts: [],
      riskAreas: [],
      note: "写真がありませんでした",
    }
  }

  const focusPoints = options?.focusPoints?.filter((s) => s.length > 0) ?? []
  const focusBlock =
    focusPoints.length > 0
      ? `

## 【重要】過去の見落としを防ぐため、以下を重点的にチェックすること
以下のような事象は過去に「AIが綺麗と判断したが実際は不良だった」事例で報告されています。該当しそうな箇所があれば必ず riskAreas および該当する項目（exteriorDamage / engineCorrosion 等）に記載してください。
- ${focusPoints.join("\n- ")}
`
      : ""

  const model = getGeminiModel()
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const promptWithFocus = GRADE_PROMPT + focusBlock
  const parts: Part[] = [{ text: promptWithFocus }]
  parts.push({
    text: `全 ${images.length} 枚の写真を確認し、上記の JSON 形式のみで回答してください。riskAreas の imageIndex は 1〜${images.length} の写真番号です。`,
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

  return parsePhotoAnalysisJsonExtended(text)
}

function parsePhotoAnalysisJson(text: string): PhotoAnalysisResult {
  const cleaned = text.replace(/```json?\s*/i, "").replace(/```\s*$/i, "").trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  return {
    exteriorDamage: Array.isArray(parsed.exteriorDamage)
      ? (parsed.exteriorDamage as string[])
      : [],
    engineCorrosion: Array.isArray(parsed.engineCorrosion)
      ? (parsed.engineCorrosion as string[])
      : [],
    consumableWear: Array.isArray(parsed.consumableWear)
      ? (parsed.consumableWear as string[])
      : [],
    customParts: Array.isArray(parsed.customParts) ? (parsed.customParts as string[]) : [],
    highValueEbayParts: Array.isArray(parsed.highValueEbayParts)
      ? (parsed.highValueEbayParts as { part: string; reason: string }[]).map((x) => ({
          part: typeof x.part === "string" ? x.part : "",
          reason: typeof x.reason === "string" ? x.reason : "",
        }))
      : [],
    note: typeof parsed.note === "string" ? parsed.note : undefined,
  }
}

function parsePhotoAnalysisJsonExtended(text: string): PhotoAnalysisResult {
  const base = parsePhotoAnalysisJson(text)
  const cleaned = text.replace(/```json?\s*/i, "").replace(/```\s*$/i, "").trim()
  const parsed = JSON.parse(cleaned) as Record<string, unknown>
  const grades = ["A", "B", "C", "D", "E"] as const
  const grade = (v: unknown): (typeof grades)[number] | undefined =>
    typeof v === "string" && grades.includes(v as (typeof grades)[number])
      ? (v as (typeof grades)[number])
      : undefined
  const riskAreas = Array.isArray(parsed.riskAreas)
    ? (parsed.riskAreas as { description?: string; imageIndex?: number; bbox?: { x?: number; y?: number; width?: number; height?: number } }[])
        .filter((x) => x && typeof x.description === "string" && typeof x.imageIndex === "number")
        .map((x) => {
          const bbox = x.bbox
          const normalized = (v: unknown): number => Math.max(0, Math.min(1, Number(v) || 0))
          const hasBbox =
            bbox &&
            typeof bbox.x === "number" &&
            typeof bbox.y === "number" &&
            typeof bbox.width === "number" &&
            typeof bbox.height === "number"
          return {
            description: String(x.description),
            imageIndex: Math.max(1, Math.floor(Number(x.imageIndex))),
            ...(hasBbox && {
              bbox: {
                x: normalized(bbox.x),
                y: normalized(bbox.y),
                width: Math.max(0.05, Math.min(1, normalized(bbox.width))),
                height: Math.max(0.05, Math.min(1, normalized(bbox.height))),
              },
            }),
          }
        })
    : []
  return {
    ...base,
    exteriorGrade: grade(parsed.exteriorGrade),
    frameGrade: grade(parsed.frameGrade),
    engineGrade: grade(parsed.engineGrade),
    riskAreas: riskAreas.length ? riskAreas : base.riskAreas,
  }
}

const STRICT_INSPECTION_PROMPT = `${FOURMINI_EXPERT_PROFILE}

## 今回のタスク（高精度鑑定）
オークション出品車両の写真を、買い手目線で「ネジ一本のサビ」や「社外品への交換痕」まで厳しくチェックしてください。

**解像度ルール**: 写真が不鮮明・低解像度で判断できない箇所は、推測でコストを出さず、strictFindings に「写真N: 不鮮明のため要再確認（○○箇所）」と正直に記載してください。

**重点ズーム箇所（素人が見落とす箇所を徹底チェック）**:
- ボルトの頭（錆・なめ・メッキ剥がれ）
- ワイヤーの取り回し・断線・ほつれ
- オイルパン底面（打ち痕・サビ・漏れ）
- フレーム接合部・溶接部のひび・錆
- キャブ周りの汚れ・サビ・ガスケット滲み

以下の観点で指摘し、修理・交換に必要なコスト（円）を必ず見積もってください。
- ボルト・ネジの錆・腐食（メッキ剥がれ含む）
- 社外パーツへの交換（純正復元が必要な場合のコスト）
- 塗装キズ・へこみの修正費
- オイル漏れ・ガスケット類の交換費
- その他、落札者が後から費用をかける可能性のある箇所

出力は必ず次の JSON のみにしてください。
{
  "strictFindings": ["指摘1（修理・交換コスト: ○○円）", "指摘2（コスト: ○○円）", ...],
  "strictRepairCost": 12345
}
strictRepairCost は、上記すべての指摘に対応する修理・交換にかかる総コスト（円）の合計です。数値のみ。`

export type StrictInspectionResult = {
  strictFindings: string[]
  strictRepairCost: number
}

/**
 * 4mini・モンキー等専門査定士として厳格に写真を解析し、経費に加算する修理コストを算出
 */
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
        mimeType: images[i].mimeType || "image/jpeg",
        data: images[i].base64,
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
  const strictRepairCost = typeof parsed.strictRepairCost === "number"
    ? Math.max(0, parsed.strictRepairCost)
    : typeof parsed.strictRepairCost === "string"
      ? Math.max(0, parseInt(parsed.strictRepairCost.replace(/\D/g, ""), 10) || 0)
      : 0
  return { strictFindings, strictRepairCost }
}
