"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ExternalLink,
  Loader2,
  Package,
  Calculator,
  Images,
  Sparkles,
  AlertTriangle,
  Target,
  AlertCircle,
  Upload,
  ClipboardList,
  Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AiZoomInspection } from "@/components/ai-zoom-inspection"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import type { VehicleStatus } from "@/lib/data"
import type { InspectionChecklistItemRow, VehicleInspectionResultRow, InspectionResultStatus } from "@/lib/db/types"
import {
  updateVehicleStatus,
  updateVehicleNotes,
  addPart,
  runPhotoAnalysis,
  uploadVehiclePhotosDirect,
  updateEvaluationActuals,
  deleteVehicle,
} from "@/app/actions/vehicles"
import {
  runBdsEvaluationAndProfitCompare,
  saveEvaluationAndScenarios,
  fetchUsdJpyRate,
} from "@/app/actions/evaluate"
import { getSettings } from "@/app/actions/settings"
import { saveBadCase } from "@/app/actions/bad-cases"
import {
  getInspectionChecklistItems,
  getVehicleInspectionResults,
  saveVehicleInspectionResult,
} from "@/app/actions/inspections"
import { toast } from "sonner"
import {
  calcGamiProfit,
  GAMI_TARGET_PROFIT_JPY,
  type GamiShippingType,
  type GamiListingType,
} from "@/lib/profit-calc"
import { getRiskAreaImageUrl } from "@/lib/risk-area-image-url"

const FALLBACK_IMAGE = "/bikes/placeholder.svg"
const STATUSES: VehicleStatus[] = ["仕入中", "査定中", "落札", "在庫あり", "出品中", "発送中", "売却済"]

type IdentifiedBrandPart = {
  partName: string
  brand: string
  estimatedUsedValueJpy: number
}

type PhotoAnalysisData = {
  exteriorDamage?: string[]
  engineCorrosion?: string[]
  consumableWear?: string[]
  customParts?: string[]
  highValueEbayParts?: { part: string; reason: string }[]
  note?: string
  /** BDS解析: 車種名・年式・走行・総合評価・価格・出品番号 */
  vehicleName?: string
  year?: number
  mileage?: string
  overallGrade?: string
  negativeItems?: string[]
  price?: number
  buyNowPrice?: number
  lotNumber?: string
  exteriorGrade?: "A" | "B" | "C" | "D" | "E"
  frameGrade?: "A" | "B" | "C" | "D" | "E"
  engineGrade?: "A" | "B" | "C" | "D" | "E"
  riskAreas?: {
    description: string
    fileId?: string
    path?: string
    imageIndex?: number
    bbox?: { x: number; y: number; width: number; height: number }
  }[]
  imagePaths?: string[]
  strictRepairCost?: number
  strictFindings?: string[]
  /** 4mini鑑定: 武川・キタコ・ヨシムラ・Gクラフト等 */
  identifiedBrandParts?: IdentifiedBrandPart[]
  riskWarnings?: string[]
  riskScoreDelta?: number
  carburetor?: string
  engineBoreUp?: string
  muffler?: string
  ebayPartsBonusJpy?: number
  typeFromBds?: string
  typeFromPhoto?: string
  typeMatch?: boolean
  originalityPercent?: number
}

type EvaluationRow = {
  id: string
  repair_cost_estimate: number | null
  negative_items: string[] | null
  photo_analysis?: PhotoAnalysisData | null
  created_at: string
  actual_repair_cost?: number | null
  actual_sale_price?: number | null
  actual_profit?: number | null
}

type ScenarioRow = {
  id: string
  scenario_type: string
  profit: number | null
  details: Record<string, unknown>
  created_at: string
}

type PartRow = {
  id: string
  part_name: string
  storage_location: string | null
  quantity: number
  created_at: string
}

type Props = {
  vehicle: VehicleDisplay
  source: "supabase" | "sheets"
  evaluations: EvaluationRow[]
  scenarios: ScenarioRow[]
  parts: PartRow[]
}

function formatJPY(n: number) {
  return `¥${n.toLocaleString()}`
}

function formatCreatedAt(iso?: string | null): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return ""
  }
}

function PhotoAnalysisSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function VehicleDetailContent({
  vehicle,
  source,
  evaluations,
  scenarios,
  parts,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<VehicleStatus>(vehicle.status)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [imageSrc, setImageSrc] = useState(vehicle.image?.trim() || FALLBACK_IMAGE)

  // 査定フォーム
  const [evalWinningBid, setEvalWinningBid] = useState("")
  const [evalYahooSale, setEvalYahooSale] = useState("")
  const [evalEbaySale, setEvalEbaySale] = useState("")
  const [evalBdsText, setEvalBdsText] = useState("")
  const [evalRunning, setEvalRunning] = useState(false)

  // パーツ追加
  const [partName, setPartName] = useState("")
  const [partLocation, setPartLocation] = useState("")
  const [partQty, setPartQty] = useState("1")
  const [addingPart, setAddingPart] = useState(false)
  const [partsList, setPartsList] = useState(parts)
  const [photoAnalysisRunning, setPhotoAnalysisRunning] = useState(false)
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<PhotoAnalysisData | null>(
    () => evaluations.find((e) => e.photo_analysis && Object.keys(e.photo_analysis).length > 0)?.photo_analysis ?? null
  )
  const [directUploading, setDirectUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const directUploadInputRef = useRef<HTMLInputElement>(null)
  const [usdJpyRate, setUsdJpyRate] = useState(150)
  const [actualRepairCost, setActualRepairCost] = useState<string>("")
  const [actualSalePrice, setActualSalePrice] = useState<string>("")
  const [actualProfit, setActualProfit] = useState<string>("")
  const [savingActuals, setSavingActuals] = useState(false)
  const [badCaseOpen, setBadCaseOpen] = useState(false)
  const [badCaseActualFindings, setBadCaseActualFindings] = useState("")
  const [badCaseFocusPointsInput, setBadCaseFocusPointsInput] = useState("")
  const [savingBadCase, setSavingBadCase] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 経費・利益計算（手動入力ベース）
  const [maxBid, setMaxBid] = useState(100000)
  const [repairCostManual, setRepairCostManual] = useState(0)
  const [domesticShipping, setDomesticShipping] = useState(30000)
  const [yahooExpectedSale, setYahooExpectedSale] = useState(200000)
  const [ebayExpectedSaleUsd, setEbayExpectedSaleUsd] = useState(800)
  const [yahooFees, setYahooFees] = useState(10000)
  const [yahooShipping, setYahooShipping] = useState(5000)
  const [ebayFeesUsd, setEbayFeesUsd] = useState(50)
  const [ebayShippingUsd, setEbayShippingUsd] = useState(40)
  const [baseFeeJpy, setBaseFeeJpy] = useState(0)
  const [gamiShippingType, setGamiShippingType] = useState<GamiShippingType>("normal")
  const [gamiListingType, setGamiListingType] = useState<GamiListingType>("body")
  const [targetProfitJpy, setTargetProfitJpy] = useState(45000)


  const [wonDialogOpen, setWonDialogOpen] = useState(false)
  const [wonPriceJpy, setWonPriceJpy] = useState(0)
  const [wonCounterparty, setWonCounterparty] = useState("")

  // Phase 2: 現地メモ・売主情報
  const [onsiteNotes, setOnsiteNotes] = useState(vehicle.onsiteNotes ?? "")
  const [sellerInfo, setSellerInfo] = useState(vehicle.sellerInfo ?? "")
  const [savingNotes, setSavingNotes] = useState(false)

  // 現物確認チェックリスト
  const [checklistItems, setChecklistItems] = useState<InspectionChecklistItemRow[]>([])
  const [inspectionResults, setInspectionResults] = useState<VehicleInspectionResultRow[]>([])
  const [inspectionLoading, setInspectionLoading] = useState(false)
  const [inspectionSavingId, setInspectionSavingId] = useState<string | null>(null)

  async function handleStatusChange(newStatus: VehicleStatus) {
    if (source !== "supabase") return
    if (newStatus === "落札") {
      setWonDialogOpen(true)
      return
    }
    setUpdatingStatus(true)
    const res = await updateVehicleStatus(vehicle.id, newStatus)
    setUpdatingStatus(false)
    if (res.success) {
      setStatus(newStatus)
      toast.success("ステータスを更新しました")
    } else toast.error(res.error)
  }

  async function handleWonSubmit() {
    if (source !== "supabase") return
    setUpdatingStatus(true)
    const res = await updateVehicleStatus(vehicle.id, "落札", {
      kobutsucho: { priceJpy: wonPriceJpy, counterparty: wonCounterparty },
    })
    setUpdatingStatus(false)
    if (res.success) {
      setWonDialogOpen(false)
      setStatus("落札")
      setWonPriceJpy(0)
      setWonCounterparty("")
      toast.success("ステータスを落札に更新し、古物台帳に1行追加しました")
    } else toast.error(res.error)
  }

  async function handleRunEvaluation() {
    const winningBid = Number(evalWinningBid) || 0
    const yahooSale = Number(evalYahooSale) || 0
    const ebaySale = Number(evalEbaySale) || 0
    if (!winningBid || !yahooSale || !ebaySale) {
      toast.error("落札額・ヤフオク予想価格・eBay予想価格を入力してください")
      return
    }
    setEvalRunning(true)
    try {
      const res = await runBdsEvaluationAndProfitCompare({
        bdsText: evalBdsText.trim() || undefined,
        winningBidJpy: winningBid,
        yahooExpectedSaleJpy: yahooSale,
        ebayExpectedSaleUsd: ebaySale,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      if (res.evaluation && res.comparison && source === "supabase") {
        await saveEvaluationAndScenarios(vehicle.id, res.evaluation, res.comparison)
      }
      toast.success("査定・利益比較を実行し、結果を保存しました")
      window.location.reload()
    } catch {
      toast.error("査定の実行に失敗しました")
    } finally {
      setEvalRunning(false)
    }
  }

  async function handleAddPart() {
    const name = partName.trim()
    if (!name) {
      toast.error("パーツ名を入力してください")
      return
    }
    if (source !== "supabase") {
      toast.error("パーツ登録は Supabase 連携車両のみ利用できます")
      return
    }
    setAddingPart(true)
    const res = await addPart(
      vehicle.id,
      name,
      partLocation.trim() || null,
      Math.max(1, parseInt(partQty, 10) || 1)
    )
    setAddingPart(false)
    if (res.success) {
      setPartsList((prev) => [
        {
          id: crypto.randomUUID(),
          part_name: name,
          storage_location: partLocation.trim() || null,
          quantity: Math.max(1, parseInt(partQty, 10) || 1),
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      setPartName("")
      setPartLocation("")
      setPartQty("1")
      toast.success("パーツを追加しました")
    } else toast.error(res.error)
  }

  const readFilesAsBase64 = (files: FileList | null): Promise<{ base64: string; mimeType: string }[]> => {
    if (!files || files.length === 0) return Promise.resolve([])
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    const list = Array.from(files).filter((f) => allowed.includes(f.type))
    return Promise.all(
      list.map(
        (f) =>
          new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
            const r = new FileReader()
            r.onload = () => {
              const data = (r.result as string)?.split(",")[1]
              if (data) resolve({ base64: data, mimeType: f.type })
              else reject(new Error("読み込み失敗"))
            }
            r.onerror = () => reject(r.error)
            r.readAsDataURL(f)
          })
      )
    )
  }

  const handleDirectUpload = async (files: FileList | null) => {
    if (source !== "supabase" || !files?.length) return
    const images = await readFilesAsBase64(files)
    if (images.length === 0) {
      toast.error("画像ファイル（JPEG/PNG/WebP/GIF）を選択してください")
      return
    }
    setDirectUploading(true)
    const res = await uploadVehiclePhotosDirect(vehicle.id, images)
    setDirectUploading(false)
    if (res.success) {
      const msg = res.failedCount
        ? `${res.count}枚成功、${res.failedCount}枚失敗。続けて「写真を一括解析して保存」を実行できます。`
        : `${res.count}枚をアップロードしました。続けて「写真を一括解析して保存」を実行できます。`
      toast.success(msg)
      window.location.reload()
    } else toast.error(res.error)
  }

  const priceInitializedRef = useRef(false)
  useEffect(() => {
    if (priceInitializedRef.current) return
    const pa = evaluations.find((e) => e.photo_analysis && Object.keys(e.photo_analysis).length > 0)?.photo_analysis
    const price = (pa as PhotoAnalysisData | undefined)?.price
    if (typeof price === "number" && price > 0) {
      setMaxBid(price)
      priceInitializedRef.current = true
    }
  }, [evaluations])

  useEffect(() => {
    if (source !== "supabase") return
    setInspectionLoading(true)
    let cancelled = false
    Promise.all([getInspectionChecklistItems(), getVehicleInspectionResults(vehicle.id)]).then(
      ([itemsRes, resultsRes]) => {
        if (cancelled) return
        if (itemsRes.success && itemsRes.items) setChecklistItems(itemsRes.items)
        if (resultsRes.success && resultsRes.results) setInspectionResults(resultsRes.results)
      }
    ).finally(() => {
      if (!cancelled) setInspectionLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [source, vehicle.id])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchUsdJpyRate(), getSettings()]).then(([rateRes, settings]) => {
      if (cancelled) return
      if (rateRes.success && rateRes.rate) setUsdJpyRate(rateRes.rate)
      setDomesticShipping(settings.domesticShippingJpy)
      setYahooFees(settings.yahooFeesJpy)
      setYahooShipping(settings.yahooShippingJpy)
      setEbayFeesUsd(settings.ebayFeesUsd)
      setEbayShippingUsd(settings.ebayShippingUsd)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setOnsiteNotes(vehicle.onsiteNotes ?? "")
    setSellerInfo(vehicle.sellerInfo ?? "")
  }, [vehicle.onsiteNotes, vehicle.sellerInfo])

  const latestEvalForActuals = evaluations[0]
  useEffect(() => {
    if (!latestEvalForActuals) return
    if (latestEvalForActuals.actual_repair_cost != null)
      setActualRepairCost(String(latestEvalForActuals.actual_repair_cost))
    if (latestEvalForActuals.actual_sale_price != null)
      setActualSalePrice(String(latestEvalForActuals.actual_sale_price))
    if (latestEvalForActuals.actual_profit != null)
      setActualProfit(String(latestEvalForActuals.actual_profit))
  }, [latestEvalForActuals?.id, latestEvalForActuals?.actual_repair_cost, latestEvalForActuals?.actual_sale_price, latestEvalForActuals?.actual_profit])

  async function handleSaveActuals() {
    if (!latestEval?.id || source !== "supabase") return
    setSavingActuals(true)
    const res = await updateEvaluationActuals(latestEval.id, {
      actual_repair_cost: actualRepairCost.trim() ? Number(actualRepairCost) : null,
      actual_sale_price: actualSalePrice.trim() ? Number(actualSalePrice) : null,
      actual_profit: actualProfit.trim() ? Number(actualProfit) : null,
    })
    setSavingActuals(false)
    if (res.success) {
      toast.success("実績を保存しました。予想 vs 実績ページでグラフを確認できます。")
      window.location.reload()
    } else toast.error(res.error)
  }

  async function handleRunPhotoAnalysis() {
    if (source !== "supabase") {
      toast.error("オークション写真解析は Supabase 連携車両のみ利用できます")
      return
    }
    setPhotoAnalysisRunning(true)
    const res = await runPhotoAnalysis(vehicle.id)
    setPhotoAnalysisRunning(false)
    if (res.success) {
      toast.success("写真を解析し、結果を保存しました")
      window.location.reload()
    } else toast.error(res.error)
  }

  const evaluationIdForBadCase = evaluations.find(
    (e) => e.photo_analysis && Object.keys(e.photo_analysis).length > 0
  )?.id

  async function handleSaveNotes() {
    if (source !== "supabase") return
    setSavingNotes(true)
    const res = await updateVehicleNotes(vehicle.id, {
      onsite_notes: onsiteNotes.trim() || null,
      seller_info: sellerInfo.trim() || null,
    })
    setSavingNotes(false)
    if (res.success) toast.success("メモを保存しました")
    else toast.error(res.error)
  }

  function getResultForItem(itemId: string): { status: InspectionResultStatus; note: string } | undefined {
    const r = inspectionResults.find((x) => x.item_id === itemId)
    if (!r) return undefined
    return { status: r.status as InspectionResultStatus, note: r.note ?? "" }
  }

  async function handleSaveInspectionResult(
    itemId: string,
    status: InspectionResultStatus,
    note: string | null
  ) {
    if (source !== "supabase") return
    setInspectionSavingId(itemId)
    const res = await saveVehicleInspectionResult({
      vehicleId: vehicle.id,
      itemId,
      status,
      note: note?.trim() || null,
    })
    setInspectionSavingId(null)
    if (res.success) {
      setInspectionResults((prev) => {
        const existing = prev.find((x) => x.item_id === itemId)
        const next = prev.filter((x) => x.item_id !== itemId)
        const updated = {
          ...(existing ?? {
            id: crypto.randomUUID(),
            vehicle_id: vehicle.id,
            item_id: itemId,
            status: "needs_check" as InspectionResultStatus,
            note: null,
            checked_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
          status,
          note: note?.trim() || null,
          checked_at: ["ok", "ng"].includes(status) ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }
        return [...next, updated as VehicleInspectionResultRow]
      })
      toast.success("チェック結果を保存しました")
    } else toast.error(res.error)
  }

  async function handleSaveBadCase() {
    if (!evaluationIdForBadCase) return
    const findings = badCaseActualFindings.trim()
    if (!findings) {
      toast.error("実際の状態（何が問題だったか）を入力してください")
      return
    }
    setSavingBadCase(true)
    const focusPoints = badCaseFocusPointsInput
      .split(/[,、，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const res = await saveBadCase({
      evaluationId: evaluationIdForBadCase,
      actualFindings: findings,
      focusPoints: focusPoints.length > 0 ? focusPoints : undefined,
    })
    setSavingBadCase(false)
    if (res.success) {
      setBadCaseOpen(false)
      setBadCaseActualFindings("")
      setBadCaseFocusPointsInput("")
      toast.success("Bad Case を保存しました。次回の写真解析で重点チェックに反映されます。")
    } else toast.error(res.error)
  }

  async function handleDeleteVehicle() {
    if (source !== "supabase") return
    setDeleting(true)
    const res = await deleteVehicle(vehicle.id)
    setDeleting(false)
    setDeleteOpen(false)
    if (res.success) {
      toast.success("車両を削除しました")
      router.push("/")
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  const latestEval = evaluations[0]

  const totalRepairCost = repairCostManual

  const gamiResult = calcGamiProfit({
    expectedSalePriceJpy: yahooExpectedSale,
    winningBidJpy: maxBid,
    baseFeeJpy,
    shippingType: gamiShippingType,
    listingType: gamiListingType,
    repairCostJpy: totalRepairCost,
    targetProfitJpy,
  })

  return (
    <div className="space-y-8">
      {/* 基本情報 */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="relative h-32 w-40 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-36 sm:w-48">
            {imageSrc.startsWith("http://") || imageSrc.startsWith("https://") ? (
              // ブックマークレットで保存したBDS画像はプロキシ経由で表示（ホットリンク制限を回避）
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/image-proxy?url=${encodeURIComponent(imageSrc)}`}
                alt={vehicle.name}
                className="h-full w-full object-cover"
                onError={() => setImageSrc(FALLBACK_IMAGE)}
              />
            ) : (
              <Image
                src={imageSrc}
                alt={vehicle.name}
                fill
                className="object-cover"
                sizes="192px"
                onError={() => setImageSrc(FALLBACK_IMAGE)}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{vehicle.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {vehicle.year != null && `${vehicle.year}年`}
              {vehicle.mileage && ` ・ ${vehicle.mileage}`}
              {(vehicle.auctionGrade ?? vehicle.bdsRating) &&
                ` ・ 評価 ${vehicle.auctionGrade ?? vehicle.bdsRating}`}
            </p>
            {vehicle.createdAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                登録日 {formatCreatedAt(vehicle.createdAt)}
              </p>
            )}
            <div className="mt-3">
              {source === "supabase" ? (
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as VehicleStatus)}
                  disabled={updatingStatus}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex rounded-md border px-3 py-2 text-sm font-medium">
                  {status}
                </span>
              )}
            </div>
            {vehicle.driveLink && (
              <a
                href={vehicle.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Google Drive フォルダを開く
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ブックマークレット登録で Drive に写真がない場合の案内 */}
      {source === "supabase" && !vehicle.driveLink && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-foreground">評価の進め方（ブックマークレットで登録した車両）</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ブックマークレットの役割は<strong className="text-foreground">「車両を1件登録してこのページを開く」</strong>まで。写真の追加・解析はすべてこのページで行います。
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">査定・利益比較だけすぐ行う</strong>
              ：下の「BDSテキスト」に査定表の内容をコピペして「査定実行して保存」を押してください。
            </li>
            <li>
              <strong className="text-foreground">写真解析も行う</strong>
              ：「オークション写真一括解析」で、<strong className="text-foreground">スクショをドラッグ＆ドロップ・ファイル選択・Ctrl+V（貼り付け）</strong>でアップロードしてから「写真を一括解析して保存」を実行してください。
            </li>
          </ul>
        </div>
      )}

      {/* BDS仕入れ 利益シミュレーター（経費・手動入力ベース） */}
      <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Target className="h-5 w-5" />
            利益シミュレーター
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            成約料・送料・整備費・販売予想などを手動で入力し、支出内訳と利益を確認します。
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">入札上限額（円）</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={500000}
                step={10000}
                value={maxBid}
                onChange={(e) => setMaxBid(Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={maxBid}
                onChange={(e) => setMaxBid(Number(e.target.value) || 0)}
                className="w-28 rounded-lg border border-input bg-background px-2 py-1.5 text-right text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground">目標利益額（円）</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1000}
                value={targetProfitJpy}
                onChange={(e) => setTargetProfitJpy(Math.max(0, Number(e.target.value) || 0))}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">成約料・Base（円）</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={baseFeeJpy}
                onChange={(e) => setBaseFeeJpy(Number(e.target.value) || 0)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">送料</label>
              <select
                value={gamiShippingType}
                onChange={(e) => setGamiShippingType(e.target.value as GamiShippingType)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="normal">通常（15,000円）</option>
                <option value="osaka">大阪（5,000円）</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">出品タイプ</label>
              <select
                value={gamiListingType}
                onChange={(e) => setGamiListingType(e.target.value as GamiListingType)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="body">車体</option>
                <option value="parts">パーツ</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">整備費（円）</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={repairCostManual}
                onChange={(e) => setRepairCostManual(Number(e.target.value) || 0)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground">販売予想価格（円）</label>
              <input
                type="number"
                inputMode="decimal"
                value={yahooExpectedSale}
                onChange={(e) => setYahooExpectedSale(Number(e.target.value) || 0)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">陸送費（円・従来式用）</label>
              <input
                type="number"
                inputMode="decimal"
                value={domesticShipping}
                onChange={(e) => setDomesticShipping(Number(e.target.value) || 0)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">eBay予想売却（USD）</label>
              <input
                type="number"
                inputMode="decimal"
                value={ebayExpectedSaleUsd}
                onChange={(e) => setEbayExpectedSaleUsd(Number(e.target.value) || 0)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">支出内訳（GAMI）</p>
            <p className="mt-1 text-sm">
              落札 {formatJPY(maxBid)} ＋ 成約料 {formatJPY(gamiResult.baseFeeJpy)} ＋ 消費税 {formatJPY(gamiResult.consumptionTaxJpy)} ＋ 送料 {formatJPY(gamiResult.shippingJpy)} ＋ ヤフオク手数料 {formatJPY(gamiResult.yahooFeeJpy)} ＋ 整備費 {formatJPY(gamiResult.repairCostJpy)} ＝ 支出合計 {formatJPY(gamiResult.totalCostJpy)}
            </p>
            <p className="mt-2 text-sm font-semibold">
              販売予想 {formatJPY(yahooExpectedSale)} − 支出合計 {formatJPY(gamiResult.totalCostJpy)} ＝ {formatJPY(gamiResult.finalProfitJpy)}
            </p>
          </div>
        </div>
      </div>

      {/* オークション写真一括解析 */}
      {source === "supabase" && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Images className="h-5 w-5" />
            オークション写真一括解析
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            写真をドラッグ＆ドロップ／ファイル選択／貼り付けでアップロードできます。Drive に保存し、Gemini で外装・フレーム・エンジン評価（A〜E）・リスク箇所・eBay高値パーツを解析します。
          </p>
          <input
            ref={directUploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => {
              handleDirectUpload(e.target.files)
              e.target.value = ""
            }}
          />
          <div
            tabIndex={0}
            role="button"
            aria-label="写真をドロップまたは貼り付け"
            className={`mt-3 rounded-lg border-2 border-dashed p-4 text-center transition-colors outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/30"
            } ${directUploading ? "pointer-events-none opacity-70" : ""}`}
            onDragOver={(e) => {
              e.preventDefault()
              if (!directUploading) setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              if (!directUploading && e.dataTransfer.files.length) handleDirectUpload(e.dataTransfer.files)
            }}
            onPaste={(e) => {
              if (directUploading || source !== "supabase") return
              if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable=\"true\"]"))
                return
              const items = e.clipboardData?.items
              if (!items) return
              const files: File[] = []
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith("image/")) {
                  const f = items[i].getAsFile()
                  if (f) files.push(f)
                }
              }
              if (files.length > 0) {
                e.preventDefault()
                const dt = new DataTransfer()
                files.forEach((f) => dt.items.add(f))
                handleDirectUpload(dt.files)
              }
            }}
          >
            {directUploading ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                アップロード中…
              </span>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  写真をここにドラッグ＆ドロップするか、
                  <button
                    type="button"
                    onClick={() => directUploadInputRef.current?.click()}
                    className="mx-1 inline-flex items-center gap-1 font-medium text-primary underline hover:no-underline"
                  >
                    <Upload className="h-4 w-4" />
                    ファイルを選択
                  </button>
                  してアップロード。スクショは
                  <span className="font-medium text-foreground">Ctrl+V（貼り付け）</span>
                  も使えます。
                </p>
                <p className="mt-1 text-xs text-muted-foreground">JPEG / PNG / WebP / GIF（複数可）</p>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunPhotoAnalysis}
              disabled={photoAnalysisRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {photoAnalysisRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Images className="h-4 w-4" />
              )}
              {photoAnalysisRunning ? "解析中…" : "写真を一括解析して保存"}
            </button>
            {source === "supabase" &&
              photoAnalysisResult &&
              evaluations.find((e) => e.photo_analysis && Object.keys(e.photo_analysis).length > 0)?.id && (
                <button
                  type="button"
                  onClick={() => setBadCaseOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/20"
                >
                  <AlertCircle className="h-4 w-4" />
                  Bad Case として保存
                </button>
              )}
          </div>

          {photoAnalysisResult && (
            <div className="mt-6 space-y-4">
              {(photoAnalysisResult.vehicleName ||
                photoAnalysisResult.year != null ||
                photoAnalysisResult.mileage ||
                photoAnalysisResult.overallGrade ||
                (typeof photoAnalysisResult.price === "number" && photoAnalysisResult.price > 0) ||
                photoAnalysisResult.lotNumber) && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-foreground">BDS解析結果</h3>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                    {photoAnalysisResult.vehicleName && (
                      <>
                        <dt className="text-muted-foreground">車種名</dt>
                        <dd className="col-span-2 sm:col-span-1 font-medium text-foreground">{photoAnalysisResult.vehicleName}</dd>
                      </>
                    )}
                    {photoAnalysisResult.year != null && (
                      <>
                        <dt className="text-muted-foreground">年式</dt>
                        <dd className="col-span-2 sm:col-span-1 font-medium text-foreground">{photoAnalysisResult.year}年</dd>
                      </>
                    )}
                    {photoAnalysisResult.mileage && (
                      <>
                        <dt className="text-muted-foreground">走行距離</dt>
                        <dd className="col-span-2 sm:col-span-1 font-medium text-foreground">{photoAnalysisResult.mileage}</dd>
                      </>
                    )}
                    {photoAnalysisResult.overallGrade && (
                      <>
                        <dt className="text-muted-foreground">総合評価</dt>
                        <dd className="col-span-2 sm:col-span-1 font-medium text-foreground">{photoAnalysisResult.overallGrade}</dd>
                      </>
                    )}
                    {typeof photoAnalysisResult.price === "number" && photoAnalysisResult.price > 0 && (
                      <>
                        <dt className="text-muted-foreground">現在価格</dt>
                        <dd className="col-span-2 sm:col-span-1 font-medium text-foreground">{formatJPY(photoAnalysisResult.price)}</dd>
                      </>
                    )}
                    {photoAnalysisResult.lotNumber && (
                      <>
                        <dt className="text-muted-foreground">出品番号</dt>
                        <dd className="col-span-2 sm:col-span-1 font-medium text-foreground">{photoAnalysisResult.lotNumber}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
              {(photoAnalysisResult.negativeItems?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground">BDS指摘の不具合箇所</h3>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {photoAnalysisResult.negativeItems!.map((item, i) => (
                      <li key={i} className="text-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(photoAnalysisResult.exteriorGrade ||
                photoAnalysisResult.frameGrade ||
                photoAnalysisResult.engineGrade) && (
                <div className="flex flex-wrap gap-4 rounded-lg bg-muted/50 p-3">
                  {photoAnalysisResult.exteriorGrade && (
                    <span className="text-sm">
                      <span className="text-muted-foreground">外装</span>{" "}
                      <span className="font-semibold text-foreground">
                        {photoAnalysisResult.exteriorGrade}
                      </span>
                    </span>
                  )}
                  {photoAnalysisResult.frameGrade && (
                    <span className="text-sm">
                      <span className="text-muted-foreground">フレーム</span>{" "}
                      <span className="font-semibold text-foreground">
                        {photoAnalysisResult.frameGrade}
                      </span>
                    </span>
                  )}
                  {photoAnalysisResult.engineGrade && (
                    <span className="text-sm">
                      <span className="text-muted-foreground">エンジン</span>{" "}
                      <span className="font-semibold text-foreground">
                        {photoAnalysisResult.engineGrade}
                      </span>
                    </span>
                  )}
                </div>
              )}
              {photoAnalysisResult.riskAreas && photoAnalysisResult.riskAreas.length > 0 && (
                <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    AIが指摘したリスク箇所
                  </h3>
                  <ul className="mt-3 space-y-4">
                    {photoAnalysisResult.riskAreas.map((risk, i) => {
                      const idOrPath = risk.path ?? risk.fileId ?? ""
                      const { src, href } = idOrPath ? getRiskAreaImageUrl(idOrPath) : { src: "", href: "" }
                      return (
                      <li
                        key={i}
                        className="flex flex-col gap-2 rounded-lg border border-border bg-background/80 p-3 sm:flex-row sm:items-start"
                      >
                        {idOrPath && src && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block shrink-0 overflow-hidden rounded-lg border border-border"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt=""
                              className="h-24 w-32 object-cover sm:h-28 sm:w-40"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          </a>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{risk.description}</p>
                          {idOrPath && href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              写真を開く
                            </a>
                          )}
                        </div>
                      </li>
                    )})}
                  </ul>
                </div>
              )}
              <PhotoAnalysisSection
                title="外装の傷"
                items={photoAnalysisResult.exteriorDamage ?? []}
              />
              <PhotoAnalysisSection
                title="エンジンの腐食・劣化"
                items={photoAnalysisResult.engineCorrosion ?? []}
              />
              <PhotoAnalysisSection
                title="消耗品の減り"
                items={photoAnalysisResult.consumableWear ?? []}
              />
              <PhotoAnalysisSection
                title="カスタムパーツの有無"
                items={photoAnalysisResult.customParts ?? []}
              />
              {photoAnalysisResult.highValueEbayParts && photoAnalysisResult.highValueEbayParts.length > 0 && (
                <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                    <Sparkles className="h-4 w-4" />
                    eBayで高値で売れそうなパーツ
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {photoAnalysisResult.highValueEbayParts.map((x, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium text-foreground">{x.part}</span>
                        <span className="ml-2 text-muted-foreground">— {x.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {photoAnalysisResult.note && (
                <p className="text-sm text-muted-foreground">{photoAnalysisResult.note}</p>
              )}
            </div>
          )}
        </div>
      )}

      {source === "supabase" &&
        photoAnalysisResult?.riskAreas?.length > 0 &&
        photoAnalysisResult.riskAreas.some((r) => r.fileId || r.path) && (
          <AiZoomInspection
            riskAreas={photoAnalysisResult.riskAreas}
            imagePaths={photoAnalysisResult.imagePaths}
          />
        )}

      {/* 査定・利益 */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Calculator className="h-5 w-5" />
          査定・利益比較
        </h2>
        {latestEval?.negative_items?.length ? (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <ul className="list-inside list-disc text-muted-foreground">
              {latestEval.negative_items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input
              type="number"
              inputMode="decimal"
              placeholder="落札額（円）"
              value={evalWinningBid}
              onChange={(e) => setEvalWinningBid(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              inputMode="decimal"
              placeholder="ヤフオク予想価格（円）"
              value={evalYahooSale}
              onChange={(e) => setEvalYahooSale(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              inputMode="decimal"
              placeholder="eBay予想価格（USD）"
              value={evalEbaySale}
              onChange={(e) => setEvalEbaySale(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="BDS 検査表テキスト（任意）"
            value={evalBdsText}
            onChange={(e) => setEvalBdsText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          {source === "supabase" && (
            <button
              type="button"
              onClick={handleRunEvaluation}
              disabled={evalRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {evalRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
              査定実行して保存
            </button>
          )}
        </div>
      </div>

      {/* 実績入力（予想 vs 実績の比較用） */}
      {source === "supabase" && latestEval && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Target className="h-5 w-5" />
            実績入力
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            売却後に実際の修理費・売却額・利益を入力すると、「予想 vs 実績」ページでグラフ表示されます。
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground">実際の修理費（円）</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="例: 25000"
                value={actualRepairCost}
                onChange={(e) => setActualRepairCost(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">実際の売却額（円）</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="例: 180000"
                value={actualSalePrice}
                onChange={(e) => setActualSalePrice(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">実際の利益（円）</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="例: 45000"
                value={actualProfit}
                onChange={(e) => setActualProfit(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveActuals}
              disabled={savingActuals}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingActuals ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              実績を保存
            </button>
            <Link
              href="/analytics"
              className="text-sm text-primary hover:underline"
            >
              予想 vs 実績のグラフを見る
            </Link>
          </div>
        </div>
      )}

      {/* パーツ */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Package className="h-5 w-5" />
          パーツ
        </h2>
        {partsList.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {partsList.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="font-medium">{p.part_name}</span>
                <span className="text-muted-foreground">
                  ×{p.quantity}
                  {p.storage_location && ` ・ ${p.storage_location}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">パーツはまだ登録されていません</p>
        )}
        {source === "supabase" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="パーツ名"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              className="min-w-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="在庫場所"
              value={partLocation}
              onChange={(e) => setPartLocation(e.target.value)}
              className="min-w-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="数量"
              value={partQty}
              onChange={(e) => setPartQty(e.target.value)}
              min={1}
              className="w-16 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleAddPart}
              disabled={addingPart}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {addingPart ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              追加
            </button>
          </div>
        )}
      </div>

      {/* Phase 2: 現地メモ・売主情報 */}
      {source === "supabase" && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-foreground">現地メモ・売主情報</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            現場での自由メモや、売主から聞いた条件などを記録できます。
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">現地メモ・所見</label>
              <Textarea
                placeholder="現地で気づいたこと、写真では分からない所見など"
                value={onsiteNotes}
                onChange={(e) => setOnsiteNotes(e.target.value)}
                rows={3}
                className="mt-1 border-input bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">売主からの情報（条件など）</label>
              <Textarea
                placeholder="売主にヒアリングした条件・希望・備考"
                value={sellerInfo}
                onChange={(e) => setSellerInfo(e.target.value)}
                rows={2}
                className="mt-1 border-input bg-background"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingNotes ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null}
              保存
            </button>
          </div>
        </div>
      )}

      {/* 現物確認チェックリスト */}
      {source === "supabase" && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ClipboardList className="h-5 w-5" />
            現物確認チェックリスト
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            現地で確認した項目をチェックし、メモを保存できます。写真では分からない内容を記録しましょう。
          </p>
          {inspectionLoading && checklistItems.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              読み込み中…
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {checklistItems.map((item) => {
                const result = getResultForItem(item.id)
                const status = result?.status ?? "needs_check"
                const note = result?.note ?? ""
                const saving = inspectionSavingId === item.id
                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Select
                            value={status}
                            onValueChange={(v) =>
                              handleSaveInspectionResult(
                                item.id,
                                v as InspectionResultStatus,
                                note || null
                              )
                            }
                            disabled={saving}
                          >
                            <SelectTrigger className="h-9 w-36 border-input bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="needs_check">要確認</SelectItem>
                              <SelectItem value="ok">OK</SelectItem>
                              <SelectItem value="ng">NG</SelectItem>
                            </SelectContent>
                          </Select>
                          {saving && (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <Textarea
                          placeholder="メモ（任意）"
                          value={note}
                          onChange={(e) => {
                            const v = e.target.value
                            setInspectionResults((prev) => {
                              const r = prev.find((x) => x.item_id === item.id)
                              const rest = prev.filter((x) => x.item_id !== item.id)
                              const base = r ?? {
                                id: crypto.randomUUID(),
                                vehicle_id: vehicle.id,
                                item_id: item.id,
                                status: "needs_check" as const,
                                note: null,
                                checked_at: null,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                              }
                              return [...rest, { ...base, note: v } as VehicleInspectionResultRow]
                            })
                          }}
                          onBlur={(e) => {
                            const v = (e.target as HTMLTextAreaElement).value
                            if (v.trim() || status !== "needs_check")
                              handleSaveInspectionResult(
                                item.id,
                                status as InspectionResultStatus,
                                v.trim() || null
                              )
                          }}
                          rows={2}
                          className="mt-2 min-h-[60px] border-input bg-background text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveInspectionResult(
                            item.id,
                            status as InspectionResultStatus,
                            note || null
                          )
                        }
                        disabled={saving}
                        className="shrink-0 self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* 車両削除（Supabase のみ・入札駄目・整理用） */}
      {source === "supabase" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-foreground">危険な操作</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            この車両を削除すると、査定・シナリオ・パーツ・Bad Case もすべて削除され、復元できません。入札に落ちた場合など、整理したいときにご利用ください。
          </p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20 touch-manipulation"
          >
            <Trash2 className="h-4 w-4" />
            この車両を削除
          </button>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>車両を削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            この車両と紐づく査定・シナリオ・パーツ・Bad Case がすべて削除されます。復元できません。よろしいですか？
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium touch-manipulation"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleDeleteVehicle}
              disabled={deleting}
              className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground touch-manipulation disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  削除中…
                </>
              ) : (
                "削除する"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={badCaseOpen} onOpenChange={setBadCaseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Bad Case として保存
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            AIが「綺麗」と判断したが実際は不良だった事例を登録します。次回以降の写真解析で、同じような見落としを防ぐため重点チェックに使います。
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                実際の状態（何が問題だったか） <span className="text-destructive">*</span>
              </label>
              <textarea
                value={badCaseActualFindings}
                onChange={(e) => setBadCaseActualFindings(e.target.value)}
                placeholder="例：隠れたサビがフレーム内側にあった、塗装の浮き・剥がれが実物で目立った"
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                重点チェック項目（任意・カンマ区切り）
              </label>
              <input
                type="text"
                value={badCaseFocusPointsInput}
                onChange={(e) => setBadCaseFocusPointsInput(e.target.value)}
                placeholder="例：隠れたサビ, 不自然な塗装の浮き, 写真では分かりにくい錆"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                未入力の場合は「実際の状態」から自動で抽出します
              </p>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setBadCaseOpen(false)}
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSaveBadCase}
              disabled={savingBadCase || !badCaseActualFindings.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {savingBadCase ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              保存
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 落札時: 古物台帳用 代金・相手方入力 */}
      <Dialog open={wonDialogOpen} onOpenChange={setWonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>落札 — 古物台帳に追加</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ステータスを「落札」にし、スプレッドシートの「古物台帳」タブに法令項目で1行追加します。
          </p>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground">代金（円）</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={wonPriceJpy || ""}
                onChange={(e) => setWonPriceJpy(Number(e.target.value) || 0)}
                placeholder="落札額"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">相手方（譲渡人）</label>
              <input
                type="text"
                value={wonCounterparty}
                onChange={(e) => setWonCounterparty(e.target.value)}
                placeholder="氏名・住所等"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setWonDialogOpen(false)}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleWonSubmit}
              disabled={updatingStatus}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              古物台帳に追加して落札にする
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
