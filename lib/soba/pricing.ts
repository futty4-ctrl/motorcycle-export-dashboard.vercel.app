// 売値モデル — 弱気売値(p30)・BDS評価点補正・整備コスト/整備後売値
import { FEE_CONST, CONSERVATIVE_PERCENTILE } from './config'

/** 実売分布の下位パーセンタイル（既定p30）。線形補間 */
export function conservativeSalePrice(sales: number[], p: number = CONSERVATIVE_PERCENTILE): number {
  if (sales.length === 0) return 0
  const s = [...sales].sort((a, b) => a - b)
  if (s.length === 1) return s[0]
  const rank = p * (s.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  if (lo === hi) return s[lo]
  return Math.round(s[lo] + (rank - lo) * (s[hi] - s[lo]))
}

/** BDS評価点(1-10)で売値を補正。6点=1.0基準・±1点で±6%目安。範囲外はクランプ */
export function gradeAdjust(base: number, grade: number): number {
  const g = Math.max(1, Math.min(10, grade))
  return Math.round(base * (1 + (g - 6) * 0.06))
}

/** 整備コスト＝工賃(時間×¥1,500)＋部品代 */
export function seibiCost(hours: number, partsYen: number): number {
  return Math.round(hours * FEE_CONST.LABOR_RATE + partsYen)
}

/** 整備後売値＝ベース売値＋整備プレミアム */
export function seibiAdjustedPrice(basePrice: number, premium: number): number {
  return basePrice + premium
}
