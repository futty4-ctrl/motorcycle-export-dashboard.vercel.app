// 相場ボード 計算エンジン — 定数・会場マスタ・手数料設定
// 設計書: docs/superpowers/specs/2026-07-11-soba-board-design.md

export type Auction = 'BDS' | 'JBA'
// standard = 原付〜125cc 標準 / bulky = ジャイロ等かさ張る車 / over125 = 126cc以上
export type VehicleClass = 'standard' | 'bulky' | 'over125'

// 落札料ブラケット（税別）。hammer が underYen 未満なら fee。underYen=null は「以上」（最上位帯）
export interface FeeBracket {
  underYen: number | null
  fee: number
}

export const OTOSHIME_BRACKETS: Record<Auction, FeeBracket[]> = {
  // BDS B会員（公式料金表・7/3計算書と検算一致）
  BDS: [
    { underYen: 50000, fee: 4200 },
    { underYen: 100000, fee: 5500 },
    { underYen: 200000, fee: 6900 },
    { underYen: 300000, fee: 7400 },
    { underYen: 400000, fee: 8200 },
    { underYen: 500000, fee: 8800 },
    { underYen: 600000, fee: 9600 },
    { underYen: 800000, fee: 10200 },
    { underYen: 1000000, fee: 11200 },
    { underYen: null, fee: 12200 },
  ],
  // JBA（ふっちー確認: 5万未満4400 / 20万未満6600 / 50万未満8800）
  JBA: [
    { underYen: 50000, fee: 4400 },
    { underYen: 200000, fee: 6600 },
    { underYen: 500000, fee: 8800 },
    { underYen: null, fee: 8800 }, // 50万以上は未提供→暫定同額（要確認）
  ],
}

// 送料（会場×車体・既定・円）。null = 要確認（未設定 → fail-loud）
export const VENUE_SHIPPING: Record<string, Partial<Record<VehicleClass, number | null>>> = {
  'BDS堺': { standard: 1000, bulky: null, over125: null },
  'JBA神戸': { standard: 1500, bulky: null, over125: null },
  'BDS関東': { standard: 10000, bulky: null, over125: null },
  'BDS九州': { standard: 13000, bulky: null, over125: null },
  'JBA神奈川': { standard: 10000, bulky: null, over125: null },
}

export const FEE_CONST = {
  YAHOO_FEE: 1980,
  AD_FEE: 700,
  MEIGI_MONTHLY: 3000,
  LABOR_RATE: 1500,
  TAX_RATE: 0.1,
}

export const TARGET_PROFIT = 20000 // 目標粗利（本命ライン）
export const TURN_FLOOR_RATE = 0.15 // 回転フロア = 仕入値 × 15%
export const CONSERVATIVE_PERCENTILE = 0.3 // 弱気売値 = 実売分布の下位30%
