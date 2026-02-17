/**
 * 利益計算ロジック
 * 利益 = 販売予想価格 - (落札額 + 陸送費 + 修理費 + 各手数料 + 送料)
 * ヤフオク車体販売 vs eBayパーツ販売 を比較（eBay は USD→JPY 換算で比較）
 */

/** scenarios.details に保存する形。いつの為替レート・どの経費で計算したか後から確認できる */
export type ScenarioDetails = {
  /** 計算に使った USD/JPY レート */
  usdJpyRate?: number
  /** レート取得時刻（ISO 8601） */
  rateFetchedAt?: string
  /** 陸送費（円） */
  domesticShippingJpy?: number
  /** ヤフオク手数料（円） */
  yahooFeesJpy?: number
  /** ヤフオク送料（円） */
  yahooShippingJpy?: number
  /** eBay 手数料（USD） */
  ebayFeesUsd?: number
  /** eBay 送料（USD） */
  ebayShippingUsd?: number
  recommended?: boolean
}

export type YahooAuctionScenario = {
  type: "yahoo_body"
  label: string
  /** 販売予想価格（円） */
  expectedSalePriceJpy: number
  /** 落札額（円） */
  winningBidJpy: number
  /** 陸送費（円） */
  domesticShippingJpy: number
  /** 修理費（円） */
  repairCostJpy: number
  /** 手数料（円）例: ヤフオク手数料等 */
  feesJpy: number
  /** 送料（円） */
  shippingCostJpy: number
  /** 利益（円） */
  profitJpy: number
}

export type EbayPartsScenario = {
  type: "ebay_parts"
  label: string
  /** 販売予想価格（USD） */
  expectedSalePriceUsd: number
  /** 落札額（円） */
  winningBidJpy: number
  /** 陸送費（円） */
  domesticShippingJpy: number
  /** 修理費（円） */
  repairCostJpy: number
  /** 手数料（円）例: 出品手数料・決済手数料等を円換算した合計 */
  feesJpy: number
  /** 送料（円）国際送料を円換算 */
  shippingCostJpy: number
  /** USD/JPY レート（換算時） */
  usdJpyRate: number
  /** 販売予想価格（円換算） */
  expectedSalePriceJpy: number
  /** 利益（円） */
  profitJpy: number
}

/**
 * 利益 = 販売予想価格 - (落札額 + 陸送費 + 修理費 + 各手数料 + 送料)
 */
export function calcProfit(params: {
  expectedSalePriceJpy: number
  winningBidJpy: number
  domesticShippingJpy: number
  repairCostJpy: number
  feesJpy: number
  shippingCostJpy: number
}): number {
  const {
    expectedSalePriceJpy,
    winningBidJpy,
    domesticShippingJpy,
    repairCostJpy,
    feesJpy,
    shippingCostJpy,
  } = params
  const cost =
    winningBidJpy +
    domesticShippingJpy +
    repairCostJpy +
    feesJpy +
    shippingCostJpy
  return expectedSalePriceJpy - cost
}

/**
 * ヤフオク車体販売シナリオの利益を計算（すべて円）
 */
export function calcYahooBodyScenario(params: {
  expectedSalePriceJpy: number
  winningBidJpy: number
  domesticShippingJpy?: number
  repairCostJpy: number
  feesJpy?: number
  shippingCostJpy?: number
}): YahooAuctionScenario {
  const domesticShippingJpy = params.domesticShippingJpy ?? 0
  const feesJpy = params.feesJpy ?? 0
  const shippingCostJpy = params.shippingCostJpy ?? 0
  const profitJpy = calcProfit({
    expectedSalePriceJpy: params.expectedSalePriceJpy,
    winningBidJpy: params.winningBidJpy,
    domesticShippingJpy,
    repairCostJpy: params.repairCostJpy,
    feesJpy,
    shippingCostJpy,
  })
  return {
    type: "yahoo_body",
    label: "ヤフオク車体販売",
    expectedSalePriceJpy: params.expectedSalePriceJpy,
    winningBidJpy: params.winningBidJpy,
    domesticShippingJpy,
    repairCostJpy: params.repairCostJpy,
    feesJpy,
    shippingCostJpy,
    profitJpy,
  }
}

/**
 * eBayパーツ販売シナリオの利益を計算（販売価格はUSD、利益は円換算で比較）
 * ebayBonusJpy: 4mini鑑定で検出したブランドパーツ・社外品の中古相場を利益に加算（円）
 */
export function calcEbayPartsScenario(
  params: {
    expectedSalePriceUsd: number
    winningBidJpy: number
    domesticShippingJpy?: number
    repairCostJpy: number
    feesUsd?: number
    shippingCostUsd?: number
    /** 4mini鑑定で検出したブランドパーツ等の中古相場（円）を利益に加算 */
    ebayBonusJpy?: number
  },
  usdJpyRate: number
): EbayPartsScenario {
  const domesticShippingJpy = params.domesticShippingJpy ?? 0
  const feesUsd = params.feesUsd ?? 0
  const shippingCostUsd = params.shippingCostUsd ?? 0
  const feesJpy = Math.round(feesUsd * usdJpyRate)
  const shippingCostJpy = Math.round(shippingCostUsd * usdJpyRate)
  const baseSaleJpy = Math.round(params.expectedSalePriceUsd * usdJpyRate)
  const ebayBonusJpy = params.ebayBonusJpy ?? 0
  const expectedSalePriceJpy = baseSaleJpy + ebayBonusJpy
  const profitJpy = calcProfit({
    expectedSalePriceJpy,
    winningBidJpy: params.winningBidJpy,
    domesticShippingJpy,
    repairCostJpy: params.repairCostJpy,
    feesJpy,
    shippingCostJpy,
  })
  return {
    type: "ebay_parts",
    label: "eBayパーツ販売",
    expectedSalePriceUsd: params.expectedSalePriceUsd,
    winningBidJpy: params.winningBidJpy,
    domesticShippingJpy,
    repairCostJpy: params.repairCostJpy,
    feesJpy,
    shippingCostJpy,
    usdJpyRate,
    expectedSalePriceJpy,
    profitJpy,
  }
}

/**
 * ヤフオクとeBayの利益を比較（為替は自動取得してリアルタイム円換算）。
 * 高い方のシナリオを recommended で返す。
 */
export async function compareYahooVsEbay(
  params: {
    /** ヤフオク: 車体販売予想価格（円） */
    yahooExpectedSaleJpy: number
    /** eBay: パーツ販売予想価格（USD） */
    ebayExpectedSaleUsd: number
    winningBidJpy: number
    repairCostJpy: number
    domesticShippingJpy?: number
    yahooFeesJpy?: number
    yahooShippingJpy?: number
    ebayFeesUsd?: number
    ebayShippingUsd?: number
    /** 4mini鑑定で検出したブランドパーツ等の中古相場（円）をeBay利益に加算 */
    ebayBonusJpy?: number
  },
  getUsdJpy: () => Promise<number>
): Promise<{
  usdJpyRate: number
  yahoo: YahooAuctionScenario
  ebay: EbayPartsScenario
  recommended: "yahoo_body" | "ebay_parts"
}> {
  const usdJpyRate = await getUsdJpy()
  const yahoo = calcYahooBodyScenario({
    expectedSalePriceJpy: params.yahooExpectedSaleJpy,
    winningBidJpy: params.winningBidJpy,
    domesticShippingJpy: params.domesticShippingJpy,
    repairCostJpy: params.repairCostJpy,
    feesJpy: params.yahooFeesJpy,
    shippingCostJpy: params.yahooShippingJpy,
  })
  const ebay = calcEbayPartsScenario(
    {
      expectedSalePriceUsd: params.ebayExpectedSaleUsd,
      winningBidJpy: params.winningBidJpy,
      domesticShippingJpy: params.domesticShippingJpy,
      repairCostJpy: params.repairCostJpy,
      feesUsd: params.ebayFeesUsd,
      shippingCostUsd: params.ebayShippingUsd,
      ebayBonusJpy: params.ebayBonusJpy,
    },
    usdJpyRate
  )
  const recommended =
    yahoo.profitJpy >= ebay.profitJpy ? "yahoo_body" : "ebay_parts"
  return { usdJpyRate, yahoo, ebay, recommended }
}
