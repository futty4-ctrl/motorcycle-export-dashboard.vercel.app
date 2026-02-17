"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { getAnalyticsData, type AnalyticsRow } from "@/app/actions/vehicles"
import { Loader2 } from "lucide-react"

function formatJPY(n: number) {
  return `¥${(n / 10_000).toFixed(1)}万`
}

export function AnalyticsCharts() {
  const [rows, setRows] = useState<AnalyticsRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAnalyticsData().then((res) => {
      if (cancelled) return
      if (res.success && res.rows) setRows(res.rows)
      else setError(res.error ?? null)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>読み込み中…</span>
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

  if (!rows?.length) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <p>実績データがまだありません。</p>
        <p className="mt-2 text-sm">
          車両詳細ページで査定結果の「実際の修理費」「実際の売却額」「実際の利益」を入力すると、ここにグラフが表示されます。
        </p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          ダッシュボードへ
        </Link>
      </div>
    )
  }

  const repairData = rows.map((r) => ({
    name: r.vehicleName.length > 10 ? r.vehicleName.slice(0, 10) + "…" : r.vehicleName,
    fullName: r.vehicleName,
    vehicleId: r.vehicleId,
    予想修理費: r.predictedRepairJpy,
    実際の修理費: r.actualRepairJpy ?? 0,
  }))

  const profitData = rows.map((r) => ({
    name: r.vehicleName.length > 10 ? r.vehicleName.slice(0, 10) + "…" : r.vehicleName,
    fullName: r.vehicleName,
    vehicleId: r.vehicleId,
    予想利益: r.predictedProfitJpy,
    実際の利益: r.actualProfitJpy ?? 0,
    ズレ: (r.actualProfitJpy ?? 0) - r.predictedProfitJpy,
  }))

  return (
    <div className="mt-6 space-y-8">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-foreground">修理費：予想 vs 実際</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 査定＋高精度鑑定の予想修理費と、実際にかかった修理費の比較
        </p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={repairData}
              margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-25}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatJPY(v)} />
              <Tooltip
                formatter={(value: number) => [formatJPY(value), ""]}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullName ?? ""}
              />
              <Legend />
              <Bar dataKey="予想修理費" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="実際の修理費" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-foreground">利益のズレ（予想 vs 実際）</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          シナリオ予想利益と実際の利益。ズレが大きい車両は査定精度の改善ポイントです。
        </p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={profitData}
              margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-25}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatJPY(v)} />
              <Tooltip
                formatter={(value: number) => [formatJPY(value), ""]}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullName ?? ""}
              />
              <Legend />
              <Bar dataKey="予想利益" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="実際の利益" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-foreground">誤差一覧（実際の利益 − 予想利益）</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">車両</th>
                <th className="pb-2 pr-4 font-medium text-right">予想利益</th>
                <th className="pb-2 pr-4 font-medium text-right">実際の利益</th>
                <th className="pb-2 font-medium text-right">ズレ</th>
              </tr>
            </thead>
            <tbody>
              {profitData.map((r, i) => (
                <tr key={i} className="border-b border-border/70">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/vehicle/${r.vehicleId}`}
                      className="text-primary hover:underline"
                    >
                      {r.fullName}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatJPY(r.予想利益)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatJPY(r.実際の利益)}</td>
                  <td className={`py-2 text-right tabular-nums ${r.ズレ >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {r.ズレ >= 0 ? "+" : ""}{formatJPY(r.ズレ)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
