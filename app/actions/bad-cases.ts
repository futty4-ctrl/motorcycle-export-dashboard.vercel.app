"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"

/**
 * 対象の査定を「Bad Case」として保存する。
 * AIが綺麗と言ったが実際は不良だった事例。actual_findings と focus_points を次回解析の重点チェックに使う。
 */
export async function saveBadCase(params: {
  evaluationId: string
  actualFindings: string
  focusPoints?: string[]
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()

    const { data: evalRow, error: evalErr } = await supabase
      .from("evaluations")
      .select("id, vehicle_id, photo_analysis")
      .eq("id", params.evaluationId)
      .single()

    if (evalErr || !evalRow) {
      return { success: false, error: "該当する査定が見つかりません。" }
    }

    const focusPoints: string[] =
      params.focusPoints && params.focusPoints.length > 0
        ? params.focusPoints.map((s) => s.trim()).filter(Boolean)
        : deriveFocusPoints(params.actualFindings)

    const aiSummary = (evalRow.photo_analysis as Record<string, unknown>) ?? {}

    const { error: insertErr } = await supabase.from("bad_cases").insert({
      evaluation_id: params.evaluationId,
      vehicle_id: evalRow.vehicle_id,
      ai_summary: aiSummary,
      actual_findings: params.actualFindings.trim(),
      focus_points: focusPoints,
    })

    if (insertErr) throw insertErr
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad Case の保存に失敗しました"
    return { success: false, error: message }
  }
}

/** actual_findings から「重点チェック項目」を簡易抽出（カンマ・改行区切り、先頭の短いフレーズ） */
function deriveFocusPoints(actualFindings: string): string[] {
  const lines = actualFindings
    .split(/[\n,、，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (lines.length === 0) return []
  return lines.slice(0, 10)
}

/**
 * 過去の Bad Case から集約した「重点チェック項目」を返す。次回の写真解析プロンプトに注入する。
 */
export async function getBadCaseFocusPoints(): Promise<{
  success: boolean
  focusPoints?: string[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: rows, error } = await supabase
      .from("bad_cases")
      .select("focus_points")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    const flat = (rows ?? [])
      .flatMap((r) => (Array.isArray(r.focus_points) ? r.focus_points : []))
      .filter((s): s is string => typeof s === "string" && s.length > 0)

    const unique = Array.from(new Set(flat))
    return { success: true, focusPoints: unique }
  } catch (err) {
    const message = err instanceof Error ? err.message : "重点チェック項目の取得に失敗しました"
    return { success: false, error: message }
  }
}
