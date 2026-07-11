// 判定エンジン — 上限落札額の逆算（落札料の帯を安全側で解く）＋3ゾーン判定
import { calcCosts } from './fees'
import { conservativeSalePrice, gradeAdjust, seibiAdjustedPrice, seibiCost } from './pricing'
import {
  OTOSHIME_BRACKETS,
  VENUE_SHIPPING,
  FEE_CONST,
  TARGET_PROFIT,
  TURN_FLOOR_RATE,
  type Auction,
  type VehicleClass,
} from './config'

export interface BidInput {
  auction: Auction
  venue: string
  vehicleClass: VehicleClass
  salePrice: number // 想定売値（弱気・評価点補正・整備後を通した最終値）
  targetProfit?: number
  seibiCost?: number
  monthlyUnits?: number
  includeAd?: boolean
}

function fixedParts(i: BidInput) {
  const shipping = VENUE_SHIPPING[i.venue]?.[i.vehicleClass]
  const shippingUnknown = shipping === null || shipping === undefined
  const meigi = Math.round(FEE_CONST.MEIGI_MONTHLY / (i.monthlyUnits ?? 1))
  const ad = (i.includeAd ?? true) ? FEE_CONST.AD_FEE : 0
  const sellSide = FEE_CONST.YAHOO_FEE + ad + (i.seibiCost ?? 0)
  return { shipping: shipping ?? 0, shippingUnknown, meigi, sellSide }
}

/**
 * hammer + otoshimeryo(hammer) <= sumBudget を満たす最大の hammer。
 * 落札料が帯依存で境界(¥50,000等)を跨ぐケースは、下側(安い落札料)帯の境界で安全側に丸める。
 */
export function solveMaxHammer(auction: Auction, sumBudget: number): number {
  let lower = 0
  let best = -Infinity
  for (const b of OTOSHIME_BRACKETS[auction]) {
    const upper = b.underYen ?? Infinity
    const cand = Math.floor(Math.min(sumBudget - b.fee, upper - 1))
    if (cand >= lower) best = Math.max(best, cand)
    lower = upper
  }
  return best === -Infinity ? 0 : Math.max(0, best)
}

/** 目標粗利(既定¥20,000)を残す最大落札額 */
export function calcMaxBid(i: BidInput): number {
  const target = i.targetProfit ?? TARGET_PROFIT
  const { shipping, meigi, sellSide } = fixedParts(i)
  const sumBudget = (i.salePrice - target - shipping - meigi - sellSide) / (1 + FEE_CONST.TAX_RATE)
  if (sumBudget <= 0) return 0
  return solveMaxHammer(i.auction, sumBudget)
}

/** 回転フロア（仕入値×15%）を残す最大落札額＝赤字/回転の境界 */
export function calcMaxBidTurn(i: BidInput): number {
  const { shipping, meigi, sellSide } = fixedParts(i)
  const shiireTarget = (i.salePrice - sellSide) / (1 + TURN_FLOOR_RATE)
  const sumBudget = (shiireTarget - shipping - meigi) / (1 + FEE_CONST.TAX_RATE)
  if (sumBudget <= 0) return 0
  return solveMaxHammer(i.auction, sumBudget)
}

export type Zone = 'green' | 'yellow' | 'red'

export interface BikeEval {
  zone: Zone
  maxBidTarget: number
  maxBidTurn: number
  expectedProfit: number
  roi: number
  shippingUnknown: boolean
}

/** 現在の想定落札額でゾーン判定＋想定利益/ROI */
export function evaluateBike(i: BidInput & { currentHammer: number }): BikeEval {
  const { shippingUnknown } = fixedParts(i)
  const maxBidTarget = calcMaxBid(i)
  const maxBidTurn = calcMaxBidTurn(i)
  const costs = calcCosts({
    auction: i.auction,
    venue: i.venue,
    vehicleClass: i.vehicleClass,
    hammerYen: i.currentHammer,
    seibiCost: i.seibiCost,
    monthlyUnits: i.monthlyUnits,
    includeAd: i.includeAd,
  })
  const expectedProfit = i.salePrice - costs.total
  const roi = costs.shiireTaxIncl > 0 ? Math.round((expectedProfit / costs.shiireTaxIncl) * 1000) / 10 : 0
  let zone: Zone
  if (i.currentHammer <= maxBidTarget) zone = 'green'
  else if (i.currentHammer <= maxBidTurn) zone = 'yellow'
  else zone = 'red'
  return { zone, maxBidTarget, maxBidTurn, expectedProfit, roi, shippingUnknown }
}

// ── 実戦の入口：実売分布→弱気売値→評価点補正→整備後→判定を一撃で ──
export interface AssessInput {
  auction: Auction
  venue: string
  vehicleClass: VehicleClass
  currentHammer: number
  salesDistribution: number[] // aucfan実売（できれば1円スタート絞り込み）
  grade?: number // BDS評価点 1-10（無指定は6=補正なし）
  seibi?: { hours: number; parts: number; premium: number } | null // 整備するなら
  monthlyUnits?: number
  includeAd?: boolean
  targetProfit?: number
}

export function assessBike(i: AssessInput): BikeEval & { salePriceUsed: number; seibiCostUsed: number } {
  const p30 = conservativeSalePrice(i.salesDistribution)
  const graded = gradeAdjust(p30, i.grade ?? 6)
  const seibiCostUsed = i.seibi ? seibiCost(i.seibi.hours, i.seibi.parts) : 0
  const salePriceUsed = i.seibi ? seibiAdjustedPrice(graded, i.seibi.premium) : graded
  const ev = evaluateBike({
    auction: i.auction,
    venue: i.venue,
    vehicleClass: i.vehicleClass,
    salePrice: salePriceUsed,
    currentHammer: i.currentHammer,
    seibiCost: seibiCostUsed,
    monthlyUnits: i.monthlyUnits,
    includeAd: i.includeAd,
    targetProfit: i.targetProfit,
  })
  return { ...ev, salePriceUsed, seibiCostUsed }
}
