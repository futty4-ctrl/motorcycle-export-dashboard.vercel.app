// 手数料モデル — 落札料ブラケット参照・仕入原価・売却側手数料
import {
  OTOSHIME_BRACKETS,
  VENUE_SHIPPING,
  FEE_CONST,
  type Auction,
  type VehicleClass,
} from './config'

/** 落札料（税別）を落札額の帯から返す */
export function getOtoshimeryo(auction: Auction, hammerYen: number): number {
  for (const b of OTOSHIME_BRACKETS[auction]) {
    if (b.underYen === null || hammerYen < b.underYen) return b.fee
  }
  return OTOSHIME_BRACKETS[auction].at(-1)!.fee
}

export interface CostInput {
  auction: Auction
  venue: string
  vehicleClass: VehicleClass
  hammerYen: number
  seibiCost?: number // 整備コスト（工賃＋部品）。既定0
  monthlyUnits?: number // 月間落札見込み台数（名義配賦用）。既定1
  includeAd?: boolean // 広告費¥700を入れるか。既定true
}

export interface CostResult {
  shippingUnknown: boolean
  otoshimeryo: number
  shiireTaxIncl: number // 仕入原価＝(落札額+落札料)×1.1 ＋ 送料 ＋ 名義/台
  sellSideFees: number // ヤフオク＋広告＋整備
  total: number
}

/** 全手数料を積む。送料未設定(会場×車体)は shippingUnknown=true で返す */
export function calcCosts(i: CostInput): CostResult {
  const shipping = VENUE_SHIPPING[i.venue]?.[i.vehicleClass]
  const shippingUnknown = shipping === null || shipping === undefined
  const otoshimeryo = getOtoshimeryo(i.auction, i.hammerYen)
  const meigiPerUnit = Math.round(FEE_CONST.MEIGI_MONTHLY / (i.monthlyUnits ?? 1))
  const taxed = Math.round((i.hammerYen + otoshimeryo) * (1 + FEE_CONST.TAX_RATE))
  const shiireTaxIncl = taxed + (shipping ?? 0) + meigiPerUnit
  const ad = (i.includeAd ?? true) ? FEE_CONST.AD_FEE : 0
  const sellSideFees = FEE_CONST.YAHOO_FEE + ad + (i.seibiCost ?? 0)
  return {
    shippingUnknown,
    otoshimeryo,
    shiireTaxIncl,
    sellSideFees,
    total: shiireTaxIncl + sellSideFees,
  }
}
