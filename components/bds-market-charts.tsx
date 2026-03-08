"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { getBdsMarketByModel, type BdsMarketRow } from "@/app/actions/vehicles"
import { Loader2, TrendingUp } from "lucide-react"

function formatJPY(n: number) {
  return `¥${(n / 10_000).toFixed(1)}万`
}

export function BdsMarketCharts() {
  const [rows, setRows] = useState<BdsMarketRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getBdsMarketByModel().then((res) => {
      if (cancelled) return
      if (res.success && res.rows) setRows(res.rows)
      else setError(res.error ?? null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
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
        <p>BDS 過去落札データがまだありません。</p>
        <p className="mt-2 text-sm">
          ブックマークレットで BDS 車両を登録し、落札価格が scenarios に保存されると、ここに車種別の平均落札額が表示されます。
        </p>
      </div>
    )
  }

  const chartData = rows.slice(0, 20).map((r) => ({
    name: r.modelName.length > 12 ? r.modelName.slice(0, 12) + "…" : r.modelName,
    fullName: r.modelName,
    平均落札額: r.averagePriceJpy,
    最低: r.minPriceJpy,
    最高: r.maxPriceJpy,
    件数: r.count,
  }))

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <TrendingUp className="h-5 w-5" />
          車種別 平均落札額（BDS 過去データ）
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ブックマークレットで登録した車両の落札価格を車種ごとに集計。上位20車種を表示。
        </p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-25}
                textAnchor="end"
                height={56}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatJPY(v)} />
              <Tooltip
                formatter={(value: number) => [formatJPY(value), ""]}
                labelFormatter={(_, payload) => {
                  const p = payload[0]?.payload
                  return p ? `${p.fullName}（${p.件数}件）` : ""
                }}
              />
              <Bar
                dataKey="平均落札額"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-foreground">車種別 相場一覧</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">車種</th>
                <th className="pb-2 pr-4 font-medium text-right">平均落札額</th>
                <th className="pb-2 pr-4 font-medium text-right">最低</th>
                <th className="pb-2 pr-4 font-medium text-right">最高</th>
                <th className="pb-2 font-medium text-right">件数</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/70">
                  <td className="py-2 pr-4 font-medium text-foreground">{r.modelName}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {formatJPY(r.averagePriceJpy)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                    {formatJPY(r.minPriceJpy)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                    {formatJPY(r.maxPriceJpy)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {r.count}件
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
