"use server"

import { evaluateBDS } from "@/lib/ai/bds-evaluator"
import { getUsdJpyRateWithMeta } from "@/lib/exchange-rate"
import { getSettings } from "@/app/actions/settings"
import { compareYahooVsEbay } from "@/lib/profit-calc"
import type { ScenarioDetails } from "@/lib/profit-calc"
import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * BDS 査定 + ヤフオク vs eBay 利益比較を一括実行
 * 為替は exchangerate-api.com で取得し、eBay 販売価格をリアルタイム円換算。経費は設定テーブルのデフォルトを使用（未指定時）
 */
export async function runBdsEvaluationAndProfitCompare(params: {
  /** BDS 検査表テキスト（任意） */
  bdsText?: string
  /** BDS 検査表画像 base64（任意。テキストと両方可） */
  bdsImageBase64?: string
  bdsImageMimeType?: string
  /** 落札額（円） */
  winningBidJpy: number
  /** ヤフオク: 車体販売予想価格（円） */
  yahooExpectedSaleJpy: number
  /** eBay: パーツ販売予想価格（USD） */
  ebayExpectedSaleUsd: number
  /** 陸送費（円）未指定時は設定のデフォルト */
  domesticShippingJpy?: number
  /** ヤフオク手数料（円）未指定時は設定のデフォルト */
  yahooFeesJpy?: number
  /** ヤフオク送料（円）未指定時は設定のデフォルト */
  yahooShippingJpy?: number
  /** eBay 手数料（USD）未指定時は設定のデフォルト */
  ebayFeesUsd?: number
  /** eBay 送料（USD）未指定時は設定のデフォルト */
  ebayShippingUsd?: number
}): Promise<{
  success: boolean
  error?: string
  evaluation?: {
    negativeItems: string[]
    repairCostEstimate: number
    repairBreakdown: { category: string; label: string; cost: number }[]
  }
  comparison?: {
    usdJpyRate: number
    rateFetchedAt: string
    yahoo: { label: string; profitJpy: number; expectedSalePriceJpy: number }
    ebay: {
      label: string
      profitJpy: number
      expectedSalePriceJpy: number
      expectedSalePriceUsd: number
    }
    recommended: "yahoo_body" | "ebay_parts"
    /** scenarios.details に保存する用（いつのレート・どの経費で計算したか） */
    details: ScenarioDetails
  }
}> {
  try {
    const settings = await getSettings()
    const domesticShippingJpy = params.domesticShippingJpy ?? settings.domesticShippingJpy
    const yahooFeesJpy = params.yahooFeesJpy ?? settings.yahooFeesJpy
    const yahooShippingJpy = params.yahooShippingJpy ?? settings.yahooShippingJpy
    const ebayFeesUsd = params.ebayFeesUsd ?? settings.ebayFeesUsd
    const ebayShippingUsd = params.ebayShippingUsd ?? settings.ebayShippingUsd

    // 1. BDS 査定: 不具合特定 + マスターから修理費概算
    const evaluation = await evaluateBDS({
      text: params.bdsText,
      imageBase64: params.bdsImageBase64,
      imageMimeType: params.bdsImageMimeType,
    })

    // 2. 為替取得（メタ付き） + ヤフオク vs eBay 利益比較
    const { rate, fetchedAt } = await getUsdJpyRateWithMeta()
    const comparison = await compareYahooVsEbay(
      {
        yahooExpectedSaleJpy: params.yahooExpectedSaleJpy,
        ebayExpectedSaleUsd: params.ebayExpectedSaleUsd,
        winningBidJpy: params.winningBidJpy,
        repairCostJpy: evaluation.repairCostEstimate,
        domesticShippingJpy,
        yahooFeesJpy,
        yahooShippingJpy,
        ebayFeesUsd,
        ebayShippingUsd,
      },
      () => Promise.resolve(rate)
    )

    const details: ScenarioDetails = {
      usdJpyRate: comparison.usdJpyRate,
      rateFetchedAt: fetchedAt,
      domesticShippingJpy,
      yahooFeesJpy,
      yahooShippingJpy,
      ebayFeesUsd,
      ebayShippingUsd,
    }

    return {
      success: true,
      evaluation: {
        negativeItems: evaluation.negativeItems,
        repairCostEstimate: evaluation.repairCostEstimate,
        repairBreakdown: evaluation.repairBreakdown.map((b) => ({
          category: b.category,
          label: b.label,
          cost: b.cost,
        })),
      },
      comparison: {
        usdJpyRate: comparison.usdJpyRate,
        rateFetchedAt: fetchedAt,
        yahoo: {
          label: comparison.yahoo.label,
          profitJpy: comparison.yahoo.profitJpy,
          expectedSalePriceJpy: comparison.yahoo.expectedSalePriceJpy,
        },
        ebay: {
          label: comparison.ebay.label,
          profitJpy: comparison.ebay.profitJpy,
          expectedSalePriceJpy: comparison.ebay.expectedSalePriceJpy,
          expectedSalePriceUsd: comparison.ebay.expectedSalePriceUsd,
        },
        recommended: comparison.recommended,
        details,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "査定・利益比較に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 査定結果・利益シナリオを Supabase に保存（runBdsEvaluationAndProfitCompare の後に呼ぶ）
 * comparison.details に為替レート・取得時刻・経費を入れ、scenarios.details に保存する
 */
export async function saveEvaluationAndScenarios(
  vehicleId: string,
  evaluation: {
    repairCostEstimate: number
    negativeItems: string[]
  },
  comparison: {
    yahoo: { profitJpy: number }
    ebay: { profitJpy: number }
    recommended: "yahoo_body" | "ebay_parts"
    details?: ScenarioDetails
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error: evalErr } = await supabase.from("evaluations").insert({
      vehicle_id: vehicleId,
      repair_cost_estimate: evaluation.repairCostEstimate,
      negative_items: evaluation.negativeItems,
    })
    if (evalErr) throw evalErr

    const details = comparison.details ?? {}
    const yahooDetails = { ...details, recommended: comparison.recommended === "yahoo_body" }
    const ebayDetails = { ...details, recommended: comparison.recommended === "ebay_parts" }

    await supabase.from("scenarios").insert([
      {
        vehicle_id: vehicleId,
        scenario_type: "yahoo_body",
        profit: comparison.yahoo.profitJpy,
        details: yahooDetails as Record<string, unknown>,
      },
      {
        vehicle_id: vehicleId,
        scenario_type: "ebay_parts",
        profit: comparison.ebay.profitJpy,
        details: ebayDetails as Record<string, unknown>,
      },
    ])
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "査定結果の保存に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 為替レートのみ取得（eBay 円換算表示用）
 */
export async function fetchUsdJpyRate(): Promise<{
  success: boolean
  rate?: number
  fetchedAt?: string
  error?: string
}> {
  try {
    const { rate, fetchedAt } = await getUsdJpyRateWithMeta()
    return { success: true, rate, fetchedAt }
  } catch (err) {
    const message = err instanceof Error ? err.message : "為替取得に失敗しました"
    return { success: false, error: message }
  }
}
