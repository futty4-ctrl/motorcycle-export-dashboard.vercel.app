"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  getVehiclesFromSupabase,
  getVehiclesFromSheet,
  getSummaryFromSheet,
  getConnectionStatus,
  type SummaryData,
} from "@/app/actions/vehicles"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import { SummaryCards } from "@/components/summary-cards"
import { VehicleList } from "@/components/vehicle-list"
import { ScreenshotUploader } from "@/components/screenshot-uploader"
import { Loader2, Search, Upload } from "lucide-react"
import { toast } from "sonner"

export function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vehicles, setVehicles] = useState<VehicleDisplay[] | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<"supabase" | "sheets" | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<{
    supabase: "ok" | "env_missing" | "error"
    supabaseMessage?: string
    sheetsConfigured: boolean
  } | null>(null)

  const [yahooKeyword, setYahooKeyword] = useState("")
  const [yahooKeywordError, setYahooKeywordError] = useState(false)
  const headerSearch = searchParams.get("q") ?? ""
  const setHeaderSearch = (v: string) => {
    const p = new URLSearchParams(searchParams.toString())
    if (v.trim()) p.set("q", v.trim())
    else p.delete("q")
    const query = p.toString()
    router.replace(query ? `/?${query}` : "/", { scroll: false })
  }

  const handleYahooSearch = () => {
    const kw = yahooKeyword.trim()
    if (!kw) {
      setYahooKeywordError(true)
      toast.error("型式や車名を入力してください")
      return
    }
    setYahooKeywordError(false)
    const encoded = encodeURIComponent(kw)
    const url = `https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encoded}&auccat=26316&ei=UTF-8`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setDataSource(null)

      const [supabaseRes, sheetsVehiclesRes, summaryRes, status] = await Promise.all([
        getVehiclesFromSupabase(),
        getVehiclesFromSheet(),
        getSummaryFromSheet(),
        getConnectionStatus(),
      ])

      if (cancelled) return
      setConnectionStatus(status)

      const errors: string[] = []

      // Supabase に車両が1件以上あるときだけ Supabase 表示。空ならスプレッドシートを表示
      const hasSupabaseVehicles = supabaseRes.success && supabaseRes.vehicles && supabaseRes.vehicles.length > 0
      const hasSheetVehicles = sheetsVehiclesRes.success && sheetsVehiclesRes.vehicles && sheetsVehiclesRes.vehicles.length > 0

      if (hasSupabaseVehicles) {
        setVehicles(supabaseRes.vehicles!)
        setDataSource("supabase")
        if (supabaseRes.error) errors.push(supabaseRes.error)
      } else if (hasSheetVehicles) {
        const display: VehicleDisplay[] = sheetsVehiclesRes.vehicles!.map((v) => ({
          id: v.id,
          status: v.status,
          name: v.name,
          year: v.year,
          image: v.image,
          profitScore: v.profitScore,
          expectedProfitJPY: v.expectedProfitJPY,
          expectedProfitUSD: v.expectedProfitUSD,
          mileage: v.mileage,
          auctionGrade: v.auctionGrade,
        }))
        setVehicles(display)
        setDataSource("sheets")
        if (supabaseRes.error) errors.push(supabaseRes.error)
      } else {
        const fallback = supabaseRes.vehicles ?? sheetsVehiclesRes.vehicles ?? []
        const list = Array.isArray(fallback) ? fallback : []
        setVehicles(list)
        if (supabaseRes.vehicles?.length) setDataSource("supabase")
        else if (sheetsVehiclesRes.vehicles?.length) setDataSource("sheets")
        else setDataSource(null)
        if (supabaseRes.error) errors.push(supabaseRes.error)
        if (sheetsVehiclesRes.error) errors.push(sheetsVehiclesRes.error)
      }

      if (!summaryRes.success && summaryRes.error) {
        errors.push(summaryRes.error)
        setSummary(null)
      } else if (summaryRes.summary) {
        setSummary(summaryRes.summary)
      } else {
        setSummary(null)
      }

      const allConfigErrors =
        errors.length > 0 &&
        errors.every(
          (e) =>
            e.includes("設定がありません") ||
            e.includes("が設定されていません") ||
            e.includes("設定されていません")
        )
      const errorMessage =
        errors.length === 0
          ? null
          : allConfigErrors && !hasSupabaseVehicles && !hasSheetVehicles
            ? "車両データを表示するには、Supabase（NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY）と Google スプレッドシート（GOOGLE_SHEETS_SPREADSHEET_ID）を設定してください。ローカルでは .env.local、Vercel では Settings → Environment Variables に同じ値を入れ、Redeploy してください。詳細は docs/VERCEL_手順.md を参照。"
            : errors.join(" / ")
      setError(errorMessage)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">車両データを読み込み中…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 rounded-xl border border-border bg-card p-4 sm:p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-base">
          <Search className="h-4 w-4 shrink-0" />
          ヤフオク車体 落札相場検索
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          型式や車名を入力すると、オートバイ車体カテゴリに絞った落札相場を新しいタブで開きます。
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
          <input
            type="text"
            placeholder="例: モンキー Z50J"
            value={yahooKeyword}
            onChange={(e) => {
              setYahooKeyword(e.target.value)
              if (yahooKeywordError) setYahooKeywordError(false)
            }}
            onKeyDown={(e) => e.key === "Enter" && handleYahooSearch()}
            className={`min-h-[44px] w-full rounded-lg border px-3 py-3 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary sm:min-h-0 sm:min-w-[200px] sm:flex-1 sm:py-2 sm:text-sm ${
              yahooKeywordError
                ? "border-red-500 bg-red-500/10 dark:border-red-400 dark:bg-red-500/10"
                : "border-input bg-background"
            }`}
          />
          <button
            type="button"
            onClick={handleYahooSearch}
            className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 sm:min-h-0 sm:py-2 sm:text-sm"
          >
            <Search className="h-4 w-4 shrink-0" />
            車体の相場を検索
          </button>
        </div>
      </div>
      {(error || connectionStatus) && (
        <div className="mb-4 space-y-3">
          {connectionStatus && (
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <p className="font-medium text-foreground">接続状況</p>
              <ul className="mt-1.5 space-y-1 text-muted-foreground">
                <li>
                  Supabase:{" "}
                  {connectionStatus.supabase === "ok" ? (
                    <span className="text-green-600 dark:text-green-400">接続OK</span>
                  ) : connectionStatus.supabase === "env_missing" ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      環境変数が読めていません（ローカル: .env.local を確認／Vercel: Settings → Environment Variables を設定して Redeploy）
                    </span>
                  ) : (
                    <span className="text-destructive">{connectionStatus.supabaseMessage ?? "接続エラー"}</span>
                  )}
                </li>
                <li>
                  スプレッドシート:{" "}
                  {connectionStatus.sheetsConfigured ? (
                    <span className="text-green-600 dark:text-green-400">GOOGLE_SHEETS_SPREADSHEET_ID 設定済み</span>
                  ) : (
                    <span className="text-muted-foreground">未設定（任意）</span>
                  )}
                </li>
              </ul>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <p>{error}</p>
              {connectionStatus?.supabase === "ok" && dataSource === "sheets" && (
                <p className="mt-2 font-medium">
                  キーは設定済みですが、Supabase のデータ取得でエラーになっています。環境変数追加・変更後は必ず <strong>Deployments → Redeploy</strong> を実行してください。Redeploy 後も出る場合は、Supabase でマイグレーション（<code className="rounded bg-amber-500/20 px-1">npx supabase db push</code>）を実行したか、URL と service_role キーが<strong>同じプロジェクト</strong>のものか確認してください。
                </p>
              )}
              {connectionStatus?.supabase !== "ok" &&
                typeof window !== "undefined" &&
                (window.location.hostname.endsWith("vercel.app") || window.location.hostname.includes("vercel.app")) && (
                <p className="mt-2 font-medium">
                  Vercel で動かすには: プロジェクトの <strong>Settings → Environment Variables</strong> に
                  <code className="mx-1 rounded bg-amber-500/20 px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>
                  と
                  <code className="mx-1 rounded bg-amber-500/20 px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>
                  を追加（.env.local と同じ値）し、<strong>Deployments → Redeploy</strong> してください。
                </p>
              )}
              {dataSource === "sheets" && connectionStatus?.supabase !== "ok" && (
                <span className="mt-1 block">Supabase 未設定のためスプレッドシートを表示しています。</span>
              )}
              <Link
                href="/setup"
                className="mt-2 inline-block font-medium text-amber-800 underline dark:text-amber-300 hover:no-underline"
              >
                はじめての使い方・Vercel 環境変数の詳細 →
              </Link>
            </div>
          )}
        </div>
      )}
      {/* 車両登録：スクショ1枚でAI解析 → 登録（主導線） */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            車両を登録（スクショ1枚）
          </h2>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          オークションの車両スクショを1枚アップロードすると、AIが車種・年式・評価などを読み取り、車両を登録します。
        </p>
        <ScreenshotUploader />
      </div>
      <Link
        href="/documents"
        className="mb-4 flex min-h-[52px] items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-4 text-left transition-colors hover:bg-muted/50 active:bg-muted touch-manipulation"
      >
        <span className="text-base font-medium text-foreground">見積・請求</span>
        <span className="text-xs text-muted-foreground">見積書・請求書 →</span>
      </Link>
      <div className="mt-4">
        <SummaryCards summary={summary} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        「あと○円以内の落札なら目標利益確保」は各車両をクリックし、詳細の利益シミュレーター（GAMI専用ルール）で目標利益額を設定して確認できます。
      </p>
      <div className="mt-2">
        <VehicleList
          vehicles={vehicles}
          dataSource={dataSource}
          onVehicleDeleted={(id) =>
            setVehicles((prev) => (prev ? prev.filter((v) => v.id !== id) : []))
          }
          externalSearch={headerSearch}
          onExternalSearchChange={setHeaderSearch}
        />
      </div>
    </>
  )
}
