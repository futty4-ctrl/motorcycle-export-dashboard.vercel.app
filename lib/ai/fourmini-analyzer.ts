import { getGeminiModel } from "./gemini"
import { FOURMINI_EXPERT_PROFILE } from "./4mini-expert-profile"

/** 検出したブランドパーツ（武川・キタコ・ヨシムラ・Gクラフト等）と中古相場 */
export type IdentifiedBrandPart = {
  partName: string
  brand: string
  estimatedUsedValueJpy: number
}

/** 4mini専門鑑定結果（eBayパーツ加算・リスク・オリジナル度） */
export type FourMiniAnalysisResult = {
  /** 検出したブランドパーツと中古相場（利益に加算） */
  identifiedBrandParts: IdentifiedBrandPart[]
  /** 4mini特有リスク警告（中華コピー・年式不一致等） */
  riskWarnings: string[]
  /** リスクスコア加算（0〜50など。警告時に大きく上げる） */
  riskScoreDelta: number
  /** キャブレター: 社外品メーカー or 純正＋状態 */
  carburetor: string
  /** エンジン: ボアアップ有無（シリンダー刻印・形状から） */
  engineBoreUp: string
  /** マフラー: オーバーレーシング等の高価品有無 */
  muffler: string
  /** eBayパーツ加算見積（キャブ/エンジン/マフラー等の社外品中古相場合計） */
  ebayPartsBonusJpy: number
  /** BDS書類の型式（入力時） */
  typeFromBds?: string
  /** 写真から判読した型式 */
  typeFromPhoto?: string
  /** 型式一致 */
  typeMatch?: boolean
  /** オリジナル度（純正維持率）0〜100% */
  originalityPercent: number
}

const FOURMINI_PROMPT = `${FOURMINI_EXPERT_PROFILE}

## 今回のタスク（4mini専門鑑定）

【1】ブランドパーツ検出（利益計算でeBay相場のプラスアルファ加算に使います）
写真に「武川（タケガワ）」「キタコ」「ヨシムラ」「Gクラフト」のロゴや特徴的な形状があれば、即座にパーツ名を特定し、中古相場（円）を見積もってください。
- ヨシムラ製キャブ（TMR/FCR）: 検出したら partName に「ヨシムラ TMR」や「ヨシムラ FCR」「ヨシムラ製キャブ」などと書く。eBay相場は約4〜7万円。
- Gクラフト製スイングアーム: 検出したら「Gクラフト スイングアーム」等と書く。eBay相場は約2〜4万円。
- 武川製スーパーヘッド: 検出したら「武川 スーパーヘッド」等と書く。eBay相場は約5〜10万円。
- 当時物純正タンク（塗装良好）: 純正タンクで塗装が良好な場合「純正タンク 塗装良好」等と書く。eBay相場は約3〜5万円。
- その他: 武川キャブ・シリンダー、キタコ、ヨシムラマフラー、Gクラフレーム等も同様に列挙。
identifiedBrandParts に { "partName": "具体的パーツ名", "brand": "武川|キタコ|ヨシムラ|Gクラフト", "estimatedUsedValueJpy": 相場円 } を列挙。見つからなければ空配列。

【2】4mini特有リスク
- 中華製コピーパーツ（粗い刻印・形状の違和感）を疑う場合は riskWarnings に「中華製コピーパーツの可能性」を追加し、riskScoreDelta を 30 以上にする。
- フレームとエンジンの年式不一致（フレームナンバーとエンジン刻印の年式が合わない）を検知した場合も riskWarnings に追加し、riskScoreDelta を 40 以上にする。

【3】重点チェック（利益計算に反映）
- carburetor: ヨシムラ・武川等の社外品か？純正なら状態は？（「社外・武川」「純正・良好」等）
- engineBoreUp: ボアアップキットが組まれているか？シリンダー刻印・形状で判断。（「ストロークアップ有」「純正」等）
- muffler: オーバーレーシング等の高価マフラーが付いているか？（「オーバーレーシング」「純正」等）
社外品なら、eBayでのパーツ単体相場を ebayPartsBonusJpy に加算（キャブ・エンジン部品・マフラーそれぞれの相場を合計した総額を数値で）。

【4】型式照合・オリジナル度（BDS書類データがある場合）
bdsType が渡されていれば、写真から判読できる型式・車台番号と照合し、typeFromPhoto（写真から）、typeMatch（一致否）、originalityPercent（純正維持率 0〜100）を出力。BDSが無い場合は typeFromPhoto と typeMatch は null、originalityPercent は写真のみから推定。

出力は必ず次の JSON のみにしてください。
{
  "identifiedBrandParts": [{"partName": "パーツ名", "brand": "武川", "estimatedUsedValueJpy": 15000}, ...],
  "riskWarnings": ["警告文", ...],
  "riskScoreDelta": 0,
  "carburetor": "説明",
  "engineBoreUp": "説明",
  "muffler": "説明",
  "ebayPartsBonusJpy": 0,
  "typeFromPhoto": "型式またはnull",
  "typeMatch": true or false or null,
  "originalityPercent": 85
}`

/**
 * 4mini専門鑑定（ブランドパーツ・リスク・キャブ/エンジン/マフラー・型式照合・オリジナル度）
 */
export async function analyzeFourMini(
  images: { base64: string; mimeType: string }[],
  bdsType?: string
): Promise<FourMiniAnalysisResult> {
  if (images.length === 0) {
    return {
      identifiedBrandParts: [],
      riskWarnings: [],
      riskScoreDelta: 0,
      carburetor: "",
      engineBoreUp: "",
      muffler: "",
      ebayPartsBonusJpy: 0,
      typeFromBds: bdsType,
      originalityPercent: 0,
    }
  }

  const model = getGeminiModel()
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
  const parts: Part[] = [
    {
      text: FOURMINI_PROMPT + (bdsType ? `\n\n【BDS書類の型式】${bdsType}` : "\n\n【BDS書類】なし。写真のみで判定してください。"),
    },
  ]
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

  const identifiedBrandParts: IdentifiedBrandPart[] = Array.isArray(parsed.identifiedBrandParts)
    ? (parsed.identifiedBrandParts as { partName?: string; brand?: string; estimatedUsedValueJpy?: number }[])
        .filter((x) => x && typeof x.partName === "string" && typeof x.brand === "string")
        .map((x) => ({
          partName: String(x.partName),
          brand: String(x.brand),
          estimatedUsedValueJpy: Math.max(0, Number(x.estimatedUsedValueJpy) || 0),
        }))
    : []

  const riskWarnings = Array.isArray(parsed.riskWarnings)
    ? (parsed.riskWarnings as string[]).filter((x) => typeof x === "string")
    : []

  const riskScoreDelta = Math.max(0, Math.min(100, Number(parsed.riskScoreDelta) || 0))

  const carburetor = typeof parsed.carburetor === "string" ? parsed.carburetor : ""
  const engineBoreUp = typeof parsed.engineBoreUp === "string" ? parsed.engineBoreUp : ""
  const muffler = typeof parsed.muffler === "string" ? parsed.muffler : ""

  const ebayPartsBonusJpy = Math.max(0, Number(parsed.ebayPartsBonusJpy) || 0)

  const typeFromPhoto =
    parsed.typeFromPhoto === null || parsed.typeFromPhoto === undefined
      ? undefined
      : String(parsed.typeFromPhoto)

  const typeMatch =
    parsed.typeMatch === null || parsed.typeMatch === undefined
      ? undefined
      : Boolean(parsed.typeMatch)

  const originalityPercent = Math.max(0, Math.min(100, Number(parsed.originalityPercent) || 0))

  return {
    identifiedBrandParts,
    riskWarnings,
    riskScoreDelta,
    carburetor,
    engineBoreUp,
    muffler,
    ebayPartsBonusJpy,
    typeFromBds: bdsType,
    typeFromPhoto,
    typeMatch,
    originalityPercent,
  }
}
