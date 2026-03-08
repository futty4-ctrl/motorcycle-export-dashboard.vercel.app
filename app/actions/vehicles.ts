"use server"

import { randomUUID } from "node:crypto"
import {
  appendSheetRow,
  appendKobutsuchoRow,
  createVehicleDriveFolder,
  extractDriveFolderId,
  getDriveFileContentAsBase64,
  getSheetValues,
  listImageFilesInFolder,
  updateSheetRange,
  uploadToDriveFolder,
} from "@/lib/google-sheets"
import {
  listVehicleImages,
  getVehicleImageAsBase64,
  uploadVehicleImageToStorage,
} from "@/lib/supabase/vehicle-images-storage"
import {
  analyzeVehiclePhotosWithGrades,
  analyzeStrictInspection,
  type PhotoAnalysisResult,
} from "@/lib/ai/photo-analyzer"
import { analyzeFourMini } from "@/lib/ai/fourmini-analyzer"
import { resizeImageForAnalysis } from "@/lib/image-resize"
import {
  extractImageUrlsFromPage,
  fetchImageAsBase64,
} from "@/lib/bds-fetch"
import type { Vehicle, VehicleStatus } from "@/lib/data"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const VALID_STATUSES: VehicleStatus[] = ["仕入中", "査定中", "落札", "在庫あり", "出品中", "売却済", "発送中"]

function parseVehicleStatus(value: string): VehicleStatus {
  const trimmed = String(value).trim()
  if (VALID_STATUSES.includes(trimmed as VehicleStatus)) {
    return trimmed as VehicleStatus
  }
  return "在庫あり"
}

/**
 * スプレッドシートの「車両」シートから車両一覧を取得する Server Action。
 *
 * シート構成（1行目はヘッダー）:
 * id | 名前 | 年 | 画像URL | ステータス | 利益スコア | 予想利益円 | 予想利益USD | 走行距離 | オークション評価
 */
export async function getVehiclesFromSheet(): Promise<{
  success: boolean
  vehicles?: Vehicle[]
  error?: string
}> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    return {
      success: false,
      error: "GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません。",
    }
  }

  try {
    const rows = await getSheetValues(spreadsheetId, "車両!A2:J1000")

    const vehicles: Vehicle[] = rows
      .filter((row) => row.length >= 1 && String(row[0] ?? "").trim())
      .map((row) => (row.length >= 10 ? row : [...row, ...Array(10 - row.length).fill("")]))
      .map((row, index) => {
        const id = String(row[0] ?? "").trim() || `row-${index + 2}`
        const name = String(row[1] ?? "").trim() || "（未入力）"
        const year = Math.max(1990, Math.min(2100, Number(row[2]) || new Date().getFullYear()))
        const image = String(row[3] ?? "").trim() || "/bikes/placeholder.svg"
        const status = parseVehicleStatus(row[4] ?? "")
        const profitScore = Math.max(0, Math.min(100, Number(row[5]) || 0))
        const expectedProfitJPY = Number(row[6]) || 0
        const expectedProfitUSD = Number(row[7]) || 0
        const mileage = String(row[8] ?? "").trim() || "0 km"
        const auctionGrade = String(row[9] ?? "").trim() || "0"

        return {
          id,
          name,
          year,
          image,
          status,
          profitScore,
          expectedProfitJPY,
          expectedProfitUSD,
          mileage,
          auctionGrade,
        }
      })

    return { success: true, vehicles }
  } catch (err) {
    const message = err instanceof Error ? err.message : "スプレッドシートの読み取りに失敗しました"
    return { success: false, error: message }
  }
}

export type SummaryData = {
  activeBids: number
  inventoryCount: number
  monthlyProfit: number
  monthlyProfitUSD: number
}

/**
 * スプレッドシートの「サマリー」シートから集計値を取得する Server Action。
 *
 * シート構成（1行目はヘッダー）:
 * 入札中 | 在庫数 | 月間利益円 | 月間利益USD
 * 12    | 47    | 2840000   | 18933
 */
export async function getSummaryFromSheet(): Promise<{
  success: boolean
  summary?: SummaryData
  error?: string
}> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    return {
      success: false,
      error: "GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません。",
    }
  }

  try {
    const rows = await getSheetValues(spreadsheetId, "サマリー!A2:D2")
    const row = rows[0]
    const summary: SummaryData = {
      activeBids: row && row.length >= 1 ? Math.max(0, Number(row[0]) || 0) : 0,
      inventoryCount: row && row.length >= 2 ? Math.max(0, Number(row[1]) || 0) : 0,
      monthlyProfit: row && row.length >= 3 ? Number(row[2]) || 0 : 0,
      monthlyProfitUSD: row && row.length >= 4 ? Number(row[3]) || 0 : 0,
    }
    return { success: true, summary }
  } catch (err) {
    const message = err instanceof Error ? err.message : "サマリーの読み取りに失敗しました"
    return { success: false, error: message }
  }
}

/**
 * スプレッドシートの1行を1台の車両（vehicle_id）として扱う。
 * 新規車両登録: vehicle_id 発行 → 該当行を1行追加 → Driveに車両IDフォルダ（inspect/photos/export）作成 → フォルダURLを該当行に書き戻し
 */
export async function addVehicleWithDriveFolder(): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    return { success: false, error: "GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません。" }
  }

  const sheetName = "車両"
  const vehicleId = randomUUID()
  const year = new Date().getFullYear()

  try {
    // 1. 該当行を1行追加（フォルダURLは空で追加し、あとで書き戻す）
    const updatedRange = await appendSheetRow(spreadsheetId, sheetName, [
      vehicleId,
      "", // 名前
      year,
      "", // 画像URL
      "仕入中",
      0, // 利益スコア
      0, // 予想利益円
      0, // 予想利益USD
      "0 km",
      "0", // オークション評価
      "", // フォルダURL（K列）→ 後で書き戻す
    ])

    // 2. Driveに「車両ID」名のフォルダを作成（配下に inspect, photos, export の3サブフォルダ）
    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ?? undefined
    const { webViewLink } = await createVehicleDriveFolder(vehicleId, parentId)

    // 3. 生成したフォルダURLをスプレッドシートの該当行（K列）に書き戻す
    const kRange = updatedRange.replace(/^(.+!)A\d+:K(\d+)$/, "$1K$2")
    await updateSheetRange(spreadsheetId, kRange, [[webViewLink]])

    // 4. Supabase にも同じ車両を登録（id を揃えて drive_link を保存）
    try {
      const supabase = createServerSupabaseClient()
      await supabase.from("vehicles").insert({
        id: vehicleId,
        status: "仕入中",
        drive_link: webViewLink,
      })
    } catch {
      // Supabase 未設定やエラーは無視（スプレッドシート・Drive は成功済み）
    }

    return {
      success: true,
      message: `車両を追加しました。ID: ${vehicleId}。Driveフォルダ: ${webViewLink}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "車両の追加に失敗しました"
    return { success: false, error: message }
  }
}

/** BDS スクショ解析結果で新規車両を追加する際の初期値 */
export type BdsInitialData = {
  vehicleName?: string | null
  modelYear?: string | null
  frameNumber?: string | null
  overallGrade?: string | null
  specialNotes?: string | null
}

/**
 * BDS スクショから抽出した情報を初期値として新規車両を登録する。
 * スプレッドシート・Drive・Supabase に追加し、名前・年式・評価・車体番号をセットする。
 */
export async function addVehicleWithInitialData(initial: BdsInitialData): Promise<{
  success: boolean
  vehicleId?: string
  message?: string
  error?: string
}> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    return { success: false, error: "GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません。" }
  }

  const sheetName = "車両"
  const vehicleId = randomUUID()
  const name = (initial.vehicleName ?? initial.frameNumber ?? "").trim() || ""
  const yearNum = initial.modelYear
    ? Math.max(1990, Math.min(2100, parseInt(initial.modelYear.replace(/\D/g, "").slice(0, 4), 10) || new Date().getFullYear()))
    : new Date().getFullYear()
  const bdsRating = (initial.overallGrade ?? "").trim() || "0"

  try {
    const updatedRange = await appendSheetRow(spreadsheetId, sheetName, [
      vehicleId,
      name,
      yearNum,
      "", // 画像URL
      "仕入中",
      0,
      0,
      0,
      "0 km",
      bdsRating,
      "",
    ])

    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ?? undefined
    const { webViewLink } = await createVehicleDriveFolder(vehicleId, parentId)
    const kRange = updatedRange.replace(/^(.+!)A\d+:K(\d+)$/, "$1K$2")
    await updateSheetRange(spreadsheetId, kRange, [[webViewLink]])

    try {
      const supabase = createServerSupabaseClient()
      await supabase.from("vehicles").insert({
        id: vehicleId,
        status: "仕入中",
        drive_link: webViewLink,
        chassis_number: (initial.frameNumber ?? initial.vehicleName ?? "").trim() || null,
        bds_rating: bdsRating || null,
      })
    } catch {
      // ignore
    }

    return {
      success: true,
      vehicleId,
      message: `車両を追加しました。${name ? ` ${name}` : ""} (ID: ${vehicleId})`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "車両の追加に失敗しました"
    return { success: false, error: message }
  }
}

const PLACEHOLDER_IMAGE = "/bikes/placeholder.svg"

/**
 * 車両を1件取得（Supabase を先に参照、なければスプレッドシート）
 */
export async function getVehicleById(id: string): Promise<{
  success: boolean
  vehicle?: VehicleDisplay
  source?: "supabase" | "sheets"
  error?: string
}> {
  try {
    try {
      const supabase = createServerSupabaseClient()
      const { data: row, error } = await supabase
      .from("vehicles")
      .select("id, status, bds_rating, chassis_number, drive_link, image_url, name, onsite_notes, seller_info, created_at")
      .eq("id", id)
      .single()

    if (!error && row) {
      const { data: scenariosRows } = await supabase
        .from("scenarios")
        .select("profit")
        .eq("vehicle_id", row.id)
      const maxProfit = Math.max(0, ...(scenariosRows ?? []).map((r) => Number(r.profit ?? 0)))
      const profitScore = Math.min(100, Math.max(0, Math.round(maxProfit / 3000)))
      const imageUrl = (row as { image_url?: string | null }).image_url?.trim()
      const r = row as { onsite_notes?: string | null; seller_info?: string | null; created_at?: string | null }
      return {
        success: true,
        source: "supabase",
        vehicle: {
          id: row.id,
          status: row.status as VehicleStatus,
          name: (row as { name?: string | null }).name?.trim() || row.chassis_number?.trim() || `車両 ${row.id.slice(0, 8)}`,
          image: imageUrl || PLACEHOLDER_IMAGE,
          profitScore,
          expectedProfitJPY: maxProfit,
          driveLink: row.drive_link,
          bdsRating: row.bds_rating,
          chassisNumber: row.chassis_number,
          onsiteNotes: r.onsite_notes?.trim() || null,
          sellerInfo: r.seller_info?.trim() || null,
          createdAt: r.created_at ?? null,
        },
      }
    }
    } catch {
      // Supabase 未設定またはエラー時はスプレッドシートへ
    }

    const sheetRes = await getVehiclesFromSheet()
    if (sheetRes.success && sheetRes.vehicles) {
      const v = sheetRes.vehicles.find((x) => x.id === id)
      if (v) return { success: true, source: "sheets", vehicle: v }
    }
    return { success: false, error: "車両が見つかりません。" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "車両の取得に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * Supabase の車両ステータスを更新（Supabase に存在する場合のみ）。
 * status が「落札」で kobutsucho を渡した場合、スプレッドシートの「古物台帳」タブに法令項目で1行追加する。
 */
export async function updateVehicleStatus(
  vehicleId: string,
  status: VehicleStatus,
  options?: {
    /** 落札時に古物台帳へ追加する代金・相手方（省略時は台帳追加しない） */
    kobutsucho?: { priceJpy: number; counterparty: string }
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("vehicles").update({ status }).eq("id", vehicleId)
    if (error) throw error

    if (status === "落札" && options?.kobutsucho) {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
      if (!spreadsheetId) {
        return { success: true }
      }
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("chassis_number")
        .eq("id", vehicleId)
        .single()
      const features =
        vehicle?.chassis_number?.trim() || `車両ID: ${vehicleId.slice(0, 8)}`
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
      await appendKobutsuchoRow(spreadsheetId, {
        date: dateStr,
        itemCategory: "二輪車",
        features,
        quantity: 1,
        priceJpy: options.kobutsucho.priceJpy,
        counterparty: options.kobutsucho.counterparty.trim() || "（要入力）",
      })
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "ステータスの更新に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 車両の現地メモ・売主情報を更新（Phase 2）
 */
export async function updateVehicleNotes(
  vehicleId: string,
  params: { onsite_notes?: string | null; seller_info?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const updates: { onsite_notes?: string | null; seller_info?: string | null } = {}
    if (params.onsite_notes !== undefined) updates.onsite_notes = params.onsite_notes?.trim() || null
    if (params.seller_info !== undefined) updates.seller_info = params.seller_info?.trim() || null
    if (Object.keys(updates).length === 0) return { success: true }
    const { error } = await supabase.from("vehicles").update(updates).eq("id", vehicleId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "メモの保存に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 車両に紐づく査定結果を取得（Supabase）
 */
export async function getEvaluationsByVehicleId(vehicleId: string) {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("evaluations")
      .select("id, repair_cost_estimate, negative_items, photo_analysis, created_at, actual_repair_cost, actual_sale_price, actual_profit")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
    if (error) throw error
    return { success: true, evaluations: data ?? [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : "査定の取得に失敗しました"
    return { success: false, error: message, evaluations: [] }
  }
}

const MAX_PHOTOS_FOR_ANALYSIS = 20

/**
 * 車両の Supabase Storage (vehicle-images) 内の写真を Gemini Vision で一括解析し、evaluations に保存する。
 * 画像は vehicle-images/{vehicleId}/ から取得。解析用のみ長辺 1024px・WebP 圧縮で軽量化してから送信する。
 */
export async function runPhotoAnalysis(vehicleId: string): Promise<{
  success: boolean
  error?: string
  evaluationId?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { error: veError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .single()
    if (veError) {
      return { success: false, error: "車両が見つかりません。" }
    }
    const imageFiles = await listVehicleImages(vehicleId, MAX_PHOTOS_FOR_ANALYSIS)
    if (imageFiles.length === 0) {
      return { success: false, error: "Storage に画像がありません。写真をアップロードしてください。" }
    }
    const toFetch = imageFiles.slice(0, MAX_PHOTOS_FOR_ANALYSIS)
    const images: { base64: string; mimeType: string }[] = []
    const publicUrls: string[] = []
    for (const f of toFetch) {
      const data = await getVehicleImageAsBase64(f.path)
      if (!data) continue
      const resized = await resizeImageForAnalysis(data.base64, data.mimeType)
      images.push(resized)
      const { data: urlData } = supabase.storage.from("vehicle-images").getPublicUrl(f.path)
      publicUrls.push(urlData.publicUrl)
    }
    if (images.length === 0) {
      return { success: false, error: "画像の取得に失敗しました。" }
    }
    const analysis = await analyzeVehiclePhotosWithGrades(images)
    const allNegative = analysis.negativeItems ?? []
    const imagePathsForStorage = toFetch.map((f) => f.path)
    const riskAreasWithFileId = ((analysis.riskAreas ?? []).length > 0 ? analysis.riskAreas : []).map((r) => {
      const idx = Math.max(0, Math.min(r.imageIndex - 1, publicUrls.length - 1))
      const fileId = publicUrls[idx] ?? null
      const path = imagePathsForStorage[idx] ?? null
      return {
        description: r.description,
        imageIndex: r.imageIndex,
        fileId: fileId ?? undefined,
        path: path ?? undefined,
        ...(r.bbox && { bbox: r.bbox }),
      }
    }).filter((r) => r.fileId || r.path) as { description: string; imageIndex?: number; fileId?: string; path?: string; bbox?: { x: number; y: number; width: number; height: number } }[]
    const photoAnalysisSave: PhotoAnalysisResult & {
      riskAreas?: { description: string; imageIndex?: number; fileId?: string; path?: string; bbox?: { x: number; y: number; width: number; height: number } }[]
      imagePaths?: string[]
    } = {
      ...analysis,
      riskAreas: riskAreasWithFileId,
      imagePaths: imagePathsForStorage,
    }
    const vehicleName = analysis.vehicleName?.trim()
    const updates: Record<string, unknown> = {}
    if (vehicleName) updates.name = vehicleName
    if (analysis.overallGrade?.trim()) updates.bds_rating = analysis.overallGrade.trim()
    if (analysis.lotNumber?.trim()) updates.lot_number = analysis.lotNumber.trim()
    if (Object.keys(updates).length > 0) {
      await supabase.from("vehicles").update(updates).eq("id", vehicleId)
    }

    const { data: inserted, error: insertError } = await supabase
      .from("evaluations")
      .insert({
        vehicle_id: vehicleId,
        repair_cost_estimate: null,
        negative_items: allNegative,
        photo_analysis: photoAnalysisSave as unknown as Record<string, unknown>,
      })
      .select("id")
      .single()
    if (insertError) throw insertError
    return { success: true, evaluationId: inserted?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "写真解析に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 高精度AI鑑定（4mini・モンキー専門査定士）。厳格チェックの修理コストを算出し、直近の evaluation の photo_analysis に保存
 * 画像は Supabase Storage (vehicle-images) から取得する。
 */
export async function runStrictInspection(vehicleId: string): Promise<{
  success: boolean
  error?: string
  strictRepairCost?: number
  strictFindings?: string[]
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { error: veError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .single()
    if (veError) {
      return { success: false, error: "車両が見つかりません。" }
    }
    const imageFiles = await listVehicleImages(vehicleId, MAX_PHOTOS_FOR_ANALYSIS)
    if (imageFiles.length === 0) {
      return { success: false, error: "Storage に画像がありません。" }
    }
    const toFetch = imageFiles.slice(0, MAX_PHOTOS_FOR_ANALYSIS)
    const images: { base64: string; mimeType: string }[] = []
    for (const f of toFetch) {
      const data = await getVehicleImageAsBase64(f.path)
      if (data) images.push(data)
    }
    const { strictFindings, strictRepairCost } = await analyzeStrictInspection(images)

    const { data: latestEval } = await supabase
      .from("evaluations")
      .select("id, photo_analysis")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const currentPhoto = (latestEval?.photo_analysis ?? {}) as Record<string, unknown>
    const updated = {
      ...currentPhoto,
      strictRepairCost,
      strictFindings,
    }
    if (latestEval?.id) {
      await supabase
        .from("evaluations")
        .update({ photo_analysis: updated })
        .eq("id", latestEval.id)
    } else {
      await supabase.from("evaluations").insert({
        vehicle_id: vehicleId,
        repair_cost_estimate: strictRepairCost,
        negative_items: [],
        photo_analysis: updated,
      })
    }
    return {
      success: true,
      strictRepairCost,
      strictFindings,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "高精度鑑定に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 4mini専門鑑定（武川・キタコ・ヨシムラ・Gクラフト検知、中華コピー・年式不一致リスク、キャブ/エンジン/マフラー重点、型式照合・オリジナル度）
 * 結果を直近 evaluation の photo_analysis にマージする
 */
export async function runFourMiniAnalysis(
  vehicleId: string,
  bdsType?: string
): Promise<{
  success: boolean
  error?: string
  identifiedBrandParts?: { partName: string; brand: string; estimatedUsedValueJpy: number }[]
  riskWarnings?: string[]
  riskScoreDelta?: number
  originalityPercent?: number
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: vehicle, error: veError } = await supabase
      .from("vehicles")
      .select("drive_link, chassis_number")
      .eq("id", vehicleId)
      .single()
    if (veError || !vehicle?.drive_link) {
      return { success: false, error: "車両または Drive フォルダが見つかりません。" }
    }
    const folderId = extractDriveFolderId(vehicle.drive_link)
    if (!folderId) {
      return { success: false, error: "Drive フォルダIDを取得できませんでした。" }
    }
    const imageFiles = await listImageFilesInFolder(folderId)
    if (imageFiles.length === 0) {
      return { success: false, error: "フォルダ内に画像がありません。" }
    }
    const toFetch = imageFiles.slice(0, MAX_PHOTOS_FOR_ANALYSIS)
    const images: { base64: string; mimeType: string }[] = []
    for (const f of toFetch) {
      const base64 = await getDriveFileContentAsBase64(f.id, f.mimeType)
      images.push({ base64, mimeType: f.mimeType })
    }
    const bdsTypeHint = bdsType?.trim() || (vehicle.chassis_number?.trim() ?? undefined)
    const fourMini = await analyzeFourMini(images, bdsTypeHint)

    const { data: latestEval } = await supabase
      .from("evaluations")
      .select("id, photo_analysis")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const currentPhoto = (latestEval?.photo_analysis ?? {}) as Record<string, unknown>
    const updated = {
      ...currentPhoto,
      identifiedBrandParts: fourMini.identifiedBrandParts,
      riskWarnings: fourMini.riskWarnings,
      riskScoreDelta: fourMini.riskScoreDelta,
      carburetor: fourMini.carburetor,
      engineBoreUp: fourMini.engineBoreUp,
      muffler: fourMini.muffler,
      ebayPartsBonusJpy: fourMini.ebayPartsBonusJpy,
      typeFromBds: fourMini.typeFromBds,
      typeFromPhoto: fourMini.typeFromPhoto,
      typeMatch: fourMini.typeMatch,
      originalityPercent: fourMini.originalityPercent,
    }
    if (latestEval?.id) {
      await supabase
        .from("evaluations")
        .update({ photo_analysis: updated })
        .eq("id", latestEval.id)
    } else {
      await supabase.from("evaluations").insert({
        vehicle_id: vehicleId,
        repair_cost_estimate: null,
        negative_items: [],
        photo_analysis: updated,
      })
    }
    return {
      success: true,
      identifiedBrandParts: fourMini.identifiedBrandParts,
      riskWarnings: fourMini.riskWarnings,
      riskScoreDelta: fourMini.riskScoreDelta,
      originalityPercent: fourMini.originalityPercent,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "4mini鑑定に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * BDS車両ページURLから画像を抽出し、GOOGLE_DRIVE_PARENT_FOLDER_ID 内に車両IDフォルダを作成して保存する
 */
export async function importPhotosFromBdsUrl(
  vehicleId: string,
  bdsPageUrl: string
): Promise<{
  success: boolean
  error?: string
  count?: number
  folderUrl?: string
  imageIds?: string[]
}> {
  try {
    const supabase = createServerSupabaseClient()
    let folderId: string
    let folderUrl: string

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("drive_link")
      .eq("id", vehicleId)
      .single()

    const existingFolderId = extractDriveFolderId(vehicle?.drive_link ?? null)
    if (existingFolderId) {
      folderId = existingFolderId
      folderUrl = vehicle!.drive_link!
    } else {
      const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ?? undefined
      const created = await createVehicleDriveFolder(vehicleId, parentId)
      folderId = created.id
      folderUrl = created.webViewLink
      await supabase
        .from("vehicles")
        .update({ drive_link: folderUrl })
        .eq("id", vehicleId)
    }

    const imageUrls = await extractImageUrlsFromPage(bdsPageUrl)
    if (imageUrls.length === 0) {
      return {
        success: false,
        error: "ページから画像を取得できませんでした。BDS が外部アクセスを制限している、または写真が JavaScript で読み込まれている可能性があります。下の「ファイルを選択」またはドラッグ＆ドロップで写真をアップロードしてください。",
      }
    }

    const imageIds: string[] = []
    const ext = (mime: string) => (mime.includes("png") ? "png" : "jpg")
    for (let i = 0; i < Math.min(imageUrls.length, 30); i++) {
      const img = await fetchImageAsBase64(imageUrls[i])
      if (!img) continue
      const name = `bds_${i + 1}.${ext(img.mimeType)}`
      const { id } = await uploadToDriveFolder(
        folderId,
        name,
        img.mimeType,
        img.base64
      )
      imageIds.push(id)
    }

    if (imageIds.length === 0) {
      return {
        success: false,
        error: "アップロード可能な画像がありませんでした（BDS の画像が取得できない場合があります）。「ファイルを選択」またはドラッグ＆ドロップで写真をアップロードしてください。",
      }
    }

    return {
      success: true,
      count: imageIds.length,
      folderUrl,
      imageIds,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "BDS写真の取り込みに失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 車両の Supabase Storage (vehicle-images) に複数画像を直接アップロードする。
 * 1枚ずつ直列アップロードでVercelタイムアウトを軽減。一部失敗しても成功した枚数を返す。
 * ブックマークレット登録車でも「ファイルを選択」で写真を上げたあと解析できる。
 */
export async function uploadVehiclePhotosDirect(
  vehicleId: string,
  images: { base64: string; mimeType: string }[]
): Promise<{
  success: boolean
  error?: string
  count?: number
  failedCount?: number
  folderUrl?: string
}> {
  if (images.length === 0) {
    return { success: false, error: "画像がありません。" }
  }
  try {
    const supabase = createServerSupabaseClient()
    const { error: veError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .single()
    if (veError) {
      return { success: false, error: "車両が見つかりません。" }
    }

    const ext = (mime: string) => (mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg")
    let firstPublicUrl: string | undefined
    let successCount = 0
    let failedCount = 0
    const toUpload = Math.min(images.length, 50)

    for (let i = 0; i < toUpload; i++) {
      const img = images[i]!
      const name = `upload_${i + 1}.${ext(img.mimeType)}`
      const result = await uploadVehicleImageToStorage(vehicleId, name, img.base64, img.mimeType)
      if ("error" in result) {
        failedCount++
      } else {
        successCount++
        if (!firstPublicUrl) firstPublicUrl = result.publicUrl
      }
    }

    if (successCount === 0) {
      return { success: false, error: "アップロードに失敗しました。" }
    }
    if (firstPublicUrl) {
      await supabase.from("vehicles").update({ image_url: firstPublicUrl }).eq("id", vehicleId)
    }
    return {
      success: true,
      count: successCount,
      ...(failedCount > 0 && { failedCount }),
      folderUrl: firstPublicUrl,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "アップロードに失敗しました"
    return { success: false, error: message }
  }
}

/**
 * BDS車両URLを1本貼るだけで車両を登録し、写真を取り込む。
 * 既に同じ source_url の車両があればその車両に写真のみ取り込む。
 */
export async function createVehicleAndImportFromBdsUrl(bdsPageUrl: string): Promise<{
  success: boolean
  error?: string
  vehicleId?: string
  count?: number
}> {
  const url = bdsPageUrl.trim()
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { success: false, error: "有効なURLを入力してください。" }
  }
  try {
    const supabase = createServerSupabaseClient()

    const { data: existing } = await supabase
      .from("vehicles")
      .select("id")
      .eq("source_url", url)
      .maybeSingle()

    let vehicleId: string
    if (existing?.id) {
      vehicleId = existing.id
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("vehicles")
        .insert({
          status: "仕入中",
          source_url: url,
        })
        .select("id")
        .single()
      if (insertError) throw insertError
      if (!inserted?.id) throw new Error("車両の作成に失敗しました")
      vehicleId = inserted.id
    }

    const importRes = await importPhotosFromBdsUrl(vehicleId, url)
    if (!importRes.success) {
      return {
        success: false,
        error: importRes.error,
        vehicleId,
      }
    }
    return {
      success: true,
      vehicleId,
      count: importRes.count,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "登録・取り込みに失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 車両に紐づく利益シナリオを取得（Supabase）
 */
export async function getScenariosByVehicleId(vehicleId: string) {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("scenarios")
      .select("id, scenario_type, profit, details, created_at")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
    if (error) throw error
    return { success: true, scenarios: data ?? [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : "シナリオの取得に失敗しました"
    return { success: false, error: message, scenarios: [] }
  }
}

/**
 * 車両に紐づくパーツ一覧を取得（Supabase）
 */
export async function getPartsByVehicleId(vehicleId: string) {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("parts")
      .select("id, part_name, storage_location, quantity, created_at")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
    if (error) throw error
    return { success: true, parts: data ?? [] }
  } catch (err) {
    const message = err instanceof Error ? err.message : "パーツの取得に失敗しました"
    return { success: false, error: message, parts: [] }
  }
}

export type InventoryPartRow = {
  id: string
  part_name: string
  storage_location: string | null
  quantity: number
  vehicle_id: string
  created_at: string
  vehicle_chassis_number: string | null
}

/**
 * 在庫管理用：全パーツを車両名（chassis_number）付きで取得
 */
export async function getPartsForInventory(): Promise<{
  success: boolean
  parts?: InventoryPartRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("parts")
      .select("id, part_name, storage_location, quantity, vehicle_id, created_at, vehicles(chassis_number)")
      .order("storage_location", { ascending: true, nullsFirst: false })
      .order("part_name", { ascending: true })
    if (error) throw error
    const rows = (data ?? []).map((row: { vehicles?: { chassis_number: string | null } | null } & Record<string, unknown>) => ({
      id: row.id as string,
      part_name: row.part_name as string,
      storage_location: (row.storage_location as string | null) ?? null,
      quantity: Number(row.quantity) || 1,
      vehicle_id: row.vehicle_id as string,
      created_at: row.created_at as string,
      vehicle_chassis_number: row.vehicles?.chassis_number ?? null,
    }))
    return { success: true, parts: rows }
  } catch (err) {
    const message = err instanceof Error ? err.message : "パーツ一覧の取得に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * パーツを1件追加（Supabase）
 */
export async function addPart(
  vehicleId: string,
  partName: string,
  storageLocation?: string | null,
  quantity?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("parts").insert({
      vehicle_id: vehicleId,
      part_name: partName.trim(),
      storage_location: storageLocation?.trim() || null,
      quantity: quantity ?? 1,
    })
    if (error) throw error
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "パーツの追加に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 査定結果に実際の修理費・売却額・利益を保存（予想 vs 実績の比較用）
 */
export async function updateEvaluationActuals(
  evaluationId: string,
  actuals: {
    actual_repair_cost?: number | null
    actual_sale_price?: number | null
    actual_profit?: number | null
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from("evaluations")
      .update({
        ...(actuals.actual_repair_cost !== undefined && { actual_repair_cost: actuals.actual_repair_cost }),
        ...(actuals.actual_sale_price !== undefined && { actual_sale_price: actuals.actual_sale_price }),
        ...(actuals.actual_profit !== undefined && { actual_profit: actuals.actual_profit }),
      })
      .eq("id", evaluationId)
    if (error) throw error
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "実績の更新に失敗しました"
    return { success: false, error: message }
  }
}

export type AnalyticsRow = {
  evaluationId: string
  vehicleId: string
  vehicleName: string
  predictedRepairJpy: number
  actualRepairJpy: number | null
  predictedProfitJpy: number
  actualProfitJpy: number | null
  actualSalePriceJpy: number | null
}

/**
 * 予想 vs 実績の比較用データ（actual が1件以上ある査定のみ）
 */
export async function getAnalyticsData(): Promise<{
  success: boolean
  rows?: AnalyticsRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: evals, error: evError } = await supabase
      .from("evaluations")
      .select("id, vehicle_id, repair_cost_estimate, photo_analysis, actual_repair_cost, actual_sale_price, actual_profit")
      .or("actual_repair_cost.not.is.null,actual_sale_price.not.is.null,actual_profit.not.is.null")
      .order("created_at", { ascending: false })
    if (evError) throw evError
    if (!evals?.length) return { success: true, rows: [] }

    const vehicleIds = [...new Set(evals.map((e) => e.vehicle_id))]
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, chassis_number")
      .in("id", vehicleIds)
    const nameById = new Map((vehicles ?? []).map((v) => [v.id, v.chassis_number?.trim() || `車両 ${v.id.slice(0, 8)}`]))

    const { data: scenarios } = await supabase
      .from("scenarios")
      .select("vehicle_id, profit")
      .in("vehicle_id", vehicleIds)
    const maxProfitByVehicle = new Map<string, number>()
    for (const s of scenarios ?? []) {
      const p = Number(s.profit) ?? 0
      const current = maxProfitByVehicle.get(s.vehicle_id) ?? -Infinity
      maxProfitByVehicle.set(s.vehicle_id, Math.max(current, p))
    }

    const rows: AnalyticsRow[] = evals.map((e) => {
      const photo = (e.photo_analysis ?? {}) as { strictRepairCost?: number }
      const strictRepair = Number(photo.strictRepairCost) || 0
      const baseRepair = Number(e.repair_cost_estimate) || 0
      const predictedRepairJpy = baseRepair + strictRepair
      const actualRepairJpy = e.actual_repair_cost != null ? Number(e.actual_repair_cost) : null
      const predictedProfitJpy = maxProfitByVehicle.get(e.vehicle_id) ?? 0
      const actualProfitJpy = e.actual_profit != null ? Number(e.actual_profit) : null
      return {
        evaluationId: e.id,
        vehicleId: e.vehicle_id,
        vehicleName: nameById.get(e.vehicle_id) ?? e.vehicle_id,
        predictedRepairJpy,
        actualRepairJpy,
        predictedProfitJpy,
        actualProfitJpy,
        actualSalePriceJpy: e.actual_sale_price != null ? Number(e.actual_sale_price) : null,
      }
    })

    return { success: true, rows }
  } catch (err) {
    const message = err instanceof Error ? err.message : "分析データの取得に失敗しました"
    return { success: false, error: message }
  }
}

/** Phase 4: 車種別 BDS 過去落札相場（bookmarklet シナリオの profit を集計） */
export type BdsMarketRow = {
  modelName: string
  averagePriceJpy: number
  minPriceJpy: number
  maxPriceJpy: number
  count: number
}

export async function getBdsMarketByModel(): Promise<{
  success: boolean
  rows?: BdsMarketRow[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: scenarios, error: scErr } = await supabase
      .from("scenarios")
      .select("vehicle_id, profit")
      .eq("scenario_type", "bookmarklet")
      .gt("profit", 0)
    if (scErr) throw scErr
    if (!scenarios?.length) return { success: true, rows: [] }

    const vehicleIds = [...new Set(scenarios.map((s) => s.vehicle_id))]
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select("id, name, chassis_number")
      .in("id", vehicleIds)
    if (vErr) throw vErr

    const nameById = new Map<string, string>()
    for (const v of vehicles ?? []) {
      const label = (v as { name?: string | null }).name?.trim() || v.chassis_number?.trim() || ""
      if (label) nameById.set(v.id, label)
    }

    const byModel = new Map<string, number[]>()
    for (const s of scenarios) {
      const profit = Number(s.profit)
      if (!Number.isFinite(profit) || profit <= 0) continue
      const name = nameById.get(s.vehicle_id)?.trim() || "（車種不明）"
      const key = name.slice(0, 50)
      if (!byModel.has(key)) byModel.set(key, [])
      byModel.get(key)!.push(profit)
    }

    const rows: BdsMarketRow[] = []
    for (const [modelName, prices] of byModel.entries()) {
      if (prices.length === 0) continue
      const sum = prices.reduce((a, b) => a + b, 0)
      rows.push({
        modelName,
        averagePriceJpy: Math.round(sum / prices.length),
        minPriceJpy: Math.min(...prices),
        maxPriceJpy: Math.max(...prices),
        count: prices.length,
      })
    }
    rows.sort((a, b) => b.count - a.count)
    return { success: true, rows }
  } catch (err) {
    const message = err instanceof Error ? err.message : "BDS相場データの取得に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * Supabase から車両一覧を取得し、シナリオ利益から利益率スコアを算出して表示用に整形する
 */
export async function getVehiclesFromSupabase(): Promise<{
  success: boolean
  vehicles?: VehicleDisplay[]
  error?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: vehiclesRows, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, status, bds_rating, chassis_number, drive_link, image_url, name, created_at")
      .order("created_at", { ascending: false })

    if (vehiclesError) throw vehiclesError
    if (!vehiclesRows?.length) {
      return { success: true, vehicles: [] }
    }

    const { data: scenariosRows } = await supabase
      .from("scenarios")
      .select("vehicle_id, profit")
    const profitByVehicle = new Map<string, number>()
    for (const row of scenariosRows ?? []) {
      const current = profitByVehicle.get(row.vehicle_id) ?? 0
      const profit = typeof row.profit === "number" ? row.profit : 0
      profitByVehicle.set(row.vehicle_id, Math.max(current, profit))
    }

    const vehicles: VehicleDisplay[] = vehiclesRows.map((v) => {
      const profit = profitByVehicle.get(v.id) ?? 0
      const profitScore = Math.min(100, Math.max(0, Math.round(profit / 3000)))
      const imageUrl = (v as { image_url?: string | null }).image_url?.trim()
      const r = v as { created_at?: string | null }
      return {
        id: v.id,
        status: v.status as VehicleStatus,
        name: (v as { name?: string | null }).name?.trim() || v.chassis_number?.trim() || `車両 ${v.id.slice(0, 8)}`,
        image: imageUrl || PLACEHOLDER_IMAGE,
        profitScore,
        expectedProfitJPY: profit,
        driveLink: v.drive_link,
        bdsRating: v.bds_rating,
        chassisNumber: v.chassis_number,
        createdAt: r.created_at ?? null,
      }
    })

    return { success: true, vehicles }
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message)
        : err instanceof Error
          ? err.message
          : "Supabase からの取得に失敗しました"
    return { success: false, error: message }
  }
}

/**
 * 接続状況の確認（環境変数が読めているか・Supabase に届いているか）。キーや URL は返さない。
 */
export async function getConnectionStatus(): Promise<{
  supabase: "ok" | "env_missing" | "error"
  supabaseMessage?: string
  sheetsConfigured: boolean
}> {
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const sheetsConfigured = !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim()

  if (!hasSupabaseEnv) {
    return { supabase: "env_missing", sheetsConfigured }
  }

  try {
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("vehicles").select("id").limit(1)
    if (error) {
      return {
        supabase: "error",
        supabaseMessage: "接続できませんでした（URL と service_role キーを確認してください）",
        sheetsConfigured,
      }
    }
    return { supabase: "ok", sheetsConfigured }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    return {
      supabase: "error",
      supabaseMessage: msg.includes("設定がありません")
        ? "環境変数が読み込まれていません。.env.local をプロジェクト直下に置き、npm run dev を再起動してください。"
        : "接続できませんでした（URL と service_role キーを確認）",
      sheetsConfigured,
    }
  }
}

/**
 * スマホで撮影した写真を当該車両の Google Drive フォルダにアップロードする
 */
export async function uploadVehiclePhoto(
  vehicleId: string,
  imageBase64: string,
  mimeType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: vehicle, error: fetchError } = await supabase
      .from("vehicles")
      .select("drive_link")
      .eq("id", vehicleId)
      .single()

    if (fetchError || !vehicle?.drive_link) {
      return {
        success: false,
        error: "車両または Drive フォルダが見つかりません。",
      }
    }

    const folderId = extractDriveFolderId(vehicle.drive_link)
    if (!folderId) {
      return { success: false, error: "Drive フォルダIDを取得できませんでした。" }
    }

    const ext = mimeType === "image/png" ? "png" : "jpg"
    const fileName = `photo_${Date.now()}.${ext}`
    await uploadToDriveFolder(folderId, fileName, mimeType, imageBase64)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "アップロードに失敗しました"
    return { success: false, error: message }
  }
}
