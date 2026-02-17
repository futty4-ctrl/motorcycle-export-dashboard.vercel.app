/**
 * USD/JPY 為替レートの取得（exchangerate-api.com 無料API・キャッシュ付き）
 * 利益比較で eBay 販売価格を円換算するために使用。scenarios.details にレートと取得時刻を保存可能。
 */

const CACHE_MS = 5 * 60 * 1000 // 5分
let cachedRate: number | null = null
let cachedAt = 0
let cachedFetchedAt: string = ""

/**
 * USD/JPY を取得。失敗時は環境変数 FALLBACK_USD_JPY または 150 を使用
 */
export async function getUsdJpyRate(): Promise<number> {
  const { rate } = await getUsdJpyRateWithMeta()
  return rate
}

/**
 * USD/JPY と取得時刻を返す。scenarios.details に保存して「いつのレートで計算したか」を残す用
 */
export async function getUsdJpyRateWithMeta(): Promise<{
  rate: number
  fetchedAt: string
}> {
  if (cachedRate !== null && cachedFetchedAt && Date.now() - cachedAt < CACHE_MS) {
    return { rate: cachedRate, fetchedAt: cachedFetchedAt }
  }
  let fallback = process.env.FALLBACK_USD_JPY
    ? Number(process.env.FALLBACK_USD_JPY)
    : 150

  try {
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      { next: { revalidate: 300 } }
    )
    if (!res.ok) throw new Error(`Exchange API ${res.status}`)
    const data = (await res.json()) as { rates?: { JPY?: number } }
    const rate = data.rates?.JPY
    if (typeof rate !== "number" || rate <= 0) throw new Error("Invalid JPY rate")
    cachedRate = rate
    cachedAt = Date.now()
    cachedFetchedAt = new Date().toISOString()
    return { rate: cachedRate, fetchedAt: cachedFetchedAt }
  } catch {
    try {
      const { getSettings } = await import("@/app/actions/settings")
      const s = await getSettings()
      fallback = s.fallbackUsdJpy
    } catch {
      // 設定取得失敗時は env または 150 のまま
    }
    cachedRate = fallback
    cachedAt = Date.now()
    cachedFetchedAt = new Date().toISOString()
    return { rate: fallback, fetchedAt: cachedFetchedAt }
  }
}

/**
 * USD を JPY に換算
 */
export function usdToJpy(usd: number, rate?: number): number {
  const r = rate ?? cachedRate ?? 150
  return Math.round(usd * r)
}
