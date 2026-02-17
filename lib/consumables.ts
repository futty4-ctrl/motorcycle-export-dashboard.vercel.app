/**
 * 4mini（モンキー・ゴリラ・エイプ）主要消耗品の相場（円）
 * AI が交換必要と判断した場合、このリストから自動で経費を加算する
 */
export const FOURMINI_CONSUMABLES: Record<string, number> = {
  /** プラグ */
  plug: 1_500,
  spark_plug: 1_500,
  /** オイル・オイル交換 */
  oil: 2_500,
  engine_oil: 2_500,
  /** タイヤ */
  tire: 8_000,
  tyre: 8_000,
  /** チェーン・スプロケット */
  chain: 12_000,
  sprocket: 6_000,
  chain_set: 18_000,
  /** ブレーキパッド */
  brake_pad: 4_000,
  brake: 4_000,
  /** バッテリー */
  battery: 5_000,
  /** エアフィルター */
  air_filter: 2_000,
  /** ガスケット類（簡易） */
  gasket: 3_000,
}

/** 日本語キーワード → マスタキー */
const KEYWORD_TO_KEY: { keywords: string[]; key: string }[] = [
  { keywords: ["プラグ", "スパークプラグ", "点火プラグ"], key: "spark_plug" },
  { keywords: ["オイル", "エンジンオイル", "交換オイル"], key: "engine_oil" },
  { keywords: ["タイヤ", "フロントタイヤ", "リアタイヤ"], key: "tire" },
  { keywords: ["チェーン", "ドライブチェーン"], key: "chain" },
  { keywords: ["スプロケ", "スプロケット"], key: "sprocket" },
  { keywords: ["ブレーキパッド", "ブレーキ"], key: "brake_pad" },
  { keywords: ["バッテリー", "バッテリ"], key: "battery" },
  { keywords: ["エアフィルター", "エアフィルタ", "空気濾過"], key: "air_filter" },
  { keywords: ["ガスケット", "ガスケ"], key: "gasket" },
]

export type ConsumableItem = {
  key: string
  label: string
  costJpy: number
}

/**
 * AI の指摘テキスト（consumableWear / strictFindings 等）から、
 * 交換が必要な消耗品を判定し、相場リストから経費を計算する
 */
export function calcConsumablesCostFromFindings(findings: string[]): {
  totalJpy: number
  items: ConsumableItem[]
} {
  const added = new Set<string>()
  const items: ConsumableItem[] = []
  const text = findings.join(" ").toLowerCase()

  for (const { keywords, key } of KEYWORD_TO_KEY) {
    if (added.has(key)) continue
    const matched = keywords.some((kw) => text.includes(kw.toLowerCase()))
    if (!matched) continue
    const cost = FOURMINI_CONSUMABLES[key] ?? FOURMINI_CONSUMABLES[key.replace(/_/g, "")] ?? 0
    if (cost <= 0) continue
    added.add(key)
    const label = keywords[0]
    items.push({ key, label, costJpy: cost })
  }

  const totalJpy = items.reduce((s, i) => s + i.costJpy, 0)
  return { totalJpy, items }
}

/**
 * 車両詳細で使う「予想修理費」に消耗品コストを加算する際の合計
 * （baseRepair + strictRepair + consumablesFromFindings）
 */
export function getConsumablesBreakdown(
  consumableWear: string[],
  strictFindings: string[]
): ConsumableItem[] {
  const { items } = calcConsumablesCostFromFindings([
    ...consumableWear,
    ...(strictFindings ?? []),
  ])
  return items
}
