"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  getVehiclesFromSupabase,
  getVehiclesFromSheet,
} from "@/app/actions/vehicles"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import { getProfitBarColorClass, getProfitBarTrackClass } from "@/lib/vehicle-display"
import { Loader2 } from "lucide-react"

export function AuctionPreviewContent() {
  const [vehicles, setVehicles] = useState<VehicleDisplay[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      const [supabaseRes, sheetsRes] = await Promise.all([
        getVehiclesFromSupabase(),
        getVehiclesFromSheet(),
      ])
      if (cancelled) return

      const hasSupabase =
        supabaseRes.success && supabaseRes.vehicles && supabaseRes.vehicles.length > 0
      const hasSheets =
        sheetsRes.success && sheetsRes.vehicles && sheetsRes.vehicles.length > 0

      if (hasSupabase) {
        setVehicles(supabaseRes.vehicles!)
      } else if (hasSheets) {
        const display: VehicleDisplay[] = sheetsRes.vehicles!.map((v) => ({
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
      } else {
        setVehicles([])
        if (sheetsRes.error) setError(sheetsRes.error)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>車両を読み込み中…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!vehicles?.length) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        比較する車両がありません。ダッシュボードで車両を追加してください。
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 font-semibold text-foreground">車両</th>
              <th className="px-4 py-3 font-semibold text-foreground">ステータス</th>
              <th className="px-4 py-3 font-semibold text-foreground">利益スコア</th>
              <th className="px-4 py-3 font-semibold text-foreground">予想利益（円）</th>
              <th className="px-4 py-3 font-semibold text-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr
                key={v.id}
                className="border-b border-border last:border-b-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/vehicle/${v.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {v.name}
                  </Link>
                  {v.year != null && (
                    <span className="ml-2 text-muted-foreground">{v.year}年</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md border border-border px-2 py-0.5 text-xs font-medium">
                    {v.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-16 overflow-hidden rounded-full ${getProfitBarTrackClass(v.profitScore)}`}
                    >
                      <div
                        className={`h-full rounded-full ${getProfitBarColorClass(v.profitScore)}`}
                        style={{ width: `${v.profitScore}%` }}
                      />
                    </div>
                    <span className="font-medium">{v.profitScore}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">
                  ¥{(v.expectedProfitJPY ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/vehicle/${v.id}`}
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    詳細・利益シミュ
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        車両名をクリックすると詳細ページで利益シミュレーター・4mini鑑定結果・オークション写真解析を確認できます。
      </p>
    </div>
  )
}
