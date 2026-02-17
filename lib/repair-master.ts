/**
 * 修理費マスター: 不具合種別 → 概算修理費（円）
 * BDS 査定で AI が特定した不具合をこのマスターで照合し、修理費を概算する
 */

export type DefectCategory =
  | "engine"       // エンジン
  | "transmission" // 変速
  | "suspension"  // サス
  | "brake"       // ブレーキ
  | "tire_wheel"  // タイヤ・ホイール
  | "body"        // 車体・外装
  | "electrical"  // 電装
  | "exhaust"     // 排気
  | "cooling"     // 冷却
  | "fuel"        // 燃料
  | "other"       // その他

/** カテゴリ別 概算修理費（円） */
export const REPAIR_COST_MASTER: Record<DefectCategory, number> = {
  engine: 80000,
  transmission: 120000,
  suspension: 45000,
  brake: 35000,
  tire_wheel: 25000,
  body: 60000,
  electrical: 30000,
  exhaust: 40000,
  cooling: 25000,
  fuel: 20000,
  other: 15000,
}

/** キーワード（日本語・英語）→ カテゴリ のマッピング。AI の出力や BDS 文言と照合する */
export const DEFECT_KEYWORDS: Record<string, DefectCategory> = {
  // engine
  エンジン: "engine",
  engine: "engine",
  オイル漏れ: "engine",
  異音: "engine",
  // transmission
  ミッション: "transmission",
  transmission: "transmission",
  クラッチ: "transmission",
  変速: "transmission",
  // suspension
  サスペンション: "suspension",
  suspension: "suspension",
  サス: "suspension",
  フォーク: "suspension",
  ショック: "suspension",
  // brake
  ブレーキ: "brake",
  brake: "brake",
  ディスク: "brake",
  // tire_wheel
  タイヤ: "tire_wheel",
  tire: "tire_wheel",
  ホイール: "tire_wheel",
  wheel: "tire_wheel",
  // body
  車体: "body",
  body: "body",
  外装: "body",
  キズ: "body",
  へこみ: "body",
  錆: "body",
  // electrical
  電装: "electrical",
  electrical: "electrical",
  バッテリー: "electrical",
  battery: "electrical",
  配線: "electrical",
  // exhaust
  排気: "exhaust",
  exhaust: "exhaust",
  マフラー: "exhaust",
  // cooling
  冷却: "cooling",
  cooling: "cooling",
  ラジエター: "cooling",
  radiator: "cooling",
  // fuel
  燃料: "fuel",
  fuel: "fuel",
  タンク: "fuel",
  fuel_tank: "fuel",
}

/**
 * 不具合文言の配列から、マスターを参照して修理費を概算する
 * @param defectLabels AI が返した不具合ラベル（例: ["エンジンオイル漏れ", "ブレーキ摩耗"]）
 */
export function estimateRepairCostFromDefects(defectLabels: string[]): {
  total: number
  breakdown: { category: DefectCategory; label: string; cost: number }[]
} {
  const matched = new Set<DefectCategory>()
  const breakdown: { category: DefectCategory; label: string; cost: number }[] = []

  for (const label of defectLabels) {
    const normalized = label.trim().toLowerCase()
    let category: DefectCategory = "other"
    for (const [keyword, cat] of Object.entries(DEFECT_KEYWORDS)) {
      if (normalized.includes(keyword.toLowerCase())) {
        category = cat
        break
      }
    }
    if (matched.has(category)) continue
    matched.add(category)
    const cost = REPAIR_COST_MASTER[category]
    breakdown.push({ category, label, cost })
  }

  const total = breakdown.reduce((sum, b) => sum + b.cost, 0)
  return { total, breakdown }
}
