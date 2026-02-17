/**
 * 検知したプレミアムパーツに対して、利益計算にeBay相場のプラスアルファを自動加算する。
 * 以下の4種は固定レンジの中間値で加算し、他はAI見積に任せる。
 */

export type PremiumPartRule = {
  id: string
  label: string
  /** 検知用キーワード（いずれかにマッチすれば加算） */
  keywords: string[]
  minJpy: number
  maxJpy: number
}

/** 利益計算に優先して使うプレミアムパーツ定義（eBay相場） */
export const PREMIUM_PART_RULES: PremiumPartRule[] = [
  {
    id: "yoshimura_carb",
    label: "ヨシムラ製キャブ (TMR/FCR)",
    keywords: ["ヨシムラ", "yoshimura", "TMR", "FCR", "tmr", "fcr", "キャブ"],
    minJpy: 40_000,
    maxJpy: 70_000,
  },
  {
    id: "gcraft_swingarm",
    label: "Gクラフト製スイングアーム",
    keywords: ["Gクラフト", "gクラフト", "G-craft", "g-craft", "スイングアーム", "スイング"],
    minJpy: 20_000,
    maxJpy: 40_000,
  },
  {
    id: "takegawa_super_head",
    label: "武川製スーパーヘッド",
    keywords: ["武川", "タケガワ", "takegawa", "スーパーヘッド", "ヘッド"],
    minJpy: 50_000,
    maxJpy: 100_000,
  },
  {
    id: "oem_tank_good_paint",
    label: "当時物純正タンク（塗装良好）",
    keywords: ["純正タンク", "当時物タンク", "塗装良好タンク", "塗装良タンク", "当時物・タンク", "純正・タンク"],
    minJpy: 30_000,
    maxJpy: 50_000,
  },
]

function midJpy(rule: PremiumPartRule): number {
  return Math.round((rule.minJpy + rule.maxJpy) / 2)
}

/** テキストがルールのキーワードのいずれかにマッチするか */
function matchesRule(text: string, rule: PremiumPartRule): boolean {
  const lower = text.toLowerCase().trim()
  return rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))
}

/** 渡されたテキスト群から、該当するプレミアムルールを収集（重複は1回だけ加算） */
function getMatchedRuleIds(texts: string[]): Set<string> {
  const matched = new Set<string>()
  for (const text of texts) {
    if (!text) continue
    for (const rule of PREMIUM_PART_RULES) {
      if (matchesRule(text, rule)) matched.add(rule.id)
    }
  }
  return matched
}

export type PremiumPartsBonusInput = {
  /** 4mini: 検出ブランドパーツ名 */
  identifiedBrandParts?: { partName: string; brand: string; estimatedUsedValueJpy?: number }[]
  /** 写真解析: 高値eBayパーツ名 */
  highValueEbayParts?: { part: string; reason?: string }[]
  /** 写真解析: カスタムパーツ文言 */
  customParts?: string[]
  /** 4mini: キャブ説明 */
  carburetor?: string
  /** 4mini: エンジン・ボアアップ説明 */
  engineBoreUp?: string
  /** 4mini: マフラー説明 */
  muffler?: string
}

/**
 * プレミアムパーツ検知に基づくeBay加算額（円）を計算する。
 * 4種のルールに該当するものは固定レンジの中間値で加算（1カテゴリ1回）。
 */
export function calcPremiumPartsBonusJpy(input: PremiumPartsBonusInput): number {
  const texts: string[] = []
  if (input.identifiedBrandParts) {
    for (const p of input.identifiedBrandParts) {
      texts.push(p.partName, p.brand)
    }
  }
  if (input.highValueEbayParts) {
    for (const x of input.highValueEbayParts) {
      texts.push(x.part, x.reason ?? "")
    }
  }
  if (input.customParts) {
    texts.push(...input.customParts)
  }
  if (input.carburetor) texts.push(input.carburetor)
  if (input.engineBoreUp) texts.push(input.engineBoreUp)
  if (input.muffler) texts.push(input.muffler)

  const matchedIds = getMatchedRuleIds(texts)
  let total = 0
  for (const rule of PREMIUM_PART_RULES) {
    if (matchedIds.has(rule.id)) total += midJpy(rule)
  }
  return total
}

/**
 * プレミアム4種に該当する identifiedBrandParts かどうか。
 * 該当する場合は利益計算で固定加算を使うため、AI見積を重複加算しないようにする。
 */
export function isPremiumPartCategory(
  partName: string,
  brand: string
): boolean {
  const texts = [partName, brand]
  const matched = getMatchedRuleIds(texts)
  return matched.size > 0
}
