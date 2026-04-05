"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  EvaluationRow,
  VehicleCategory,
  ConditionRank,
} from "@/lib/db/types"

export type BiddingInput = {
  vehicle_id?: string | null
  // 車両新規作成用（vehicle_id 未指定時に使用）
  new_vehicle?: {
    bds_rating?: string | null
    chassis_number?: string | null
    onsite_notes?: string | null
  }
  vehicle_category: VehicleCategory
  condition_rank: ConditionRank
  estimated_sale_price: number
  repair_cost_estimate: number
  transport_cost?: number
  auction_fee_rate?: number
  yahoo_fee_rate?: number
  ad_cost?: number
  target_profit?: number
  sale_price_source?: string | null
  decision_reason?: string | null
  bid_decision?: "GO" | "NO GO" | "見送り" | null
}

export type BiddingSaveResult = {
  success: boolean
  error?: string
  evaluation?: EvaluationRow
  vehicle_id?: string
}

/**
 * 入札判断評価を保存。トリガーで bid_limit_best / bid_limit_min / bid_decision が自動算出される。
 */
export async function saveBiddingEvaluation(
  input: BiddingInput
): Promise<BiddingSaveResult> {
  try {
    const supabase = createServerSupabaseClient()

    // 車両がなければ新規作成
    let vehicleId = input.vehicle_id ?? null
    if (!vehicleId) {
      const { data: vehicle, error: vErr } = await supabase
        .from("vehicles")
        .insert({
          status: "査定中",
          bds_rating: input.new_vehicle?.bds_rating ?? null,
          chassis_number: input.new_vehicle?.chassis_number ?? null,
          onsite_notes: input.new_vehicle?.onsite_notes ?? null,
        })
        .select()
        .single()
      if (vErr || !vehicle) throw vErr ?? new Error("車両作成に失敗しました")
      vehicleId = vehicle.id as string
    }

    const { data: evaluation, error: eErr } = await supabase
      .from("evaluations")
      .insert({
        vehicle_id: vehicleId,
        vehicle_category: input.vehicle_category,
        condition_rank: input.condition_rank,
        estimated_sale_price: input.estimated_sale_price,
        repair_cost_estimate: input.repair_cost_estimate,
        transport_cost: input.transport_cost ?? 20000,
        auction_fee_rate: input.auction_fee_rate ?? 0.1,
        yahoo_fee_rate: input.yahoo_fee_rate ?? 0.088,
        ad_cost: input.ad_cost ?? 700,
        target_profit: input.target_profit ?? 50000,
        sale_price_source: input.sale_price_source ?? null,
        decision_reason: input.decision_reason ?? null,
        bid_decision: input.bid_decision ?? null,
      })
      .select()
      .single()
    if (eErr || !evaluation) throw eErr ?? new Error("評価保存に失敗しました")

    return {
      success: true,
      vehicle_id: vehicleId,
      evaluation: evaluation as EvaluationRow,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "保存に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 入札判断を手動で上書き（GO / NO GO / 見送り）
 */
export async function updateBidDecision(
  evaluationId: string,
  decision: "GO" | "NO GO" | "見送り",
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from("evaluations")
      .update({
        bid_decision: decision,
        decision_reason: reason ?? null,
      })
      .eq("id", evaluationId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 評価一覧を取得（新しい順）
 */
export async function listBiddingEvaluations(limit = 50): Promise<{
  success: boolean
  error?: string
  evaluations?: (EvaluationRow & {
    vehicle?: { bds_rating: string | null; chassis_number: string | null; onsite_notes: string | null }
  })[]
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("evaluations")
      .select("*, vehicle:vehicles(bds_rating, chassis_number, onsite_notes)")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return {
      success: true,
      evaluations: (data ?? []) as (EvaluationRow & {
        vehicle?: { bds_rating: string | null; chassis_number: string | null; onsite_notes: string | null }
      })[],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました"
    return { success: false, error: message }
  }
}

