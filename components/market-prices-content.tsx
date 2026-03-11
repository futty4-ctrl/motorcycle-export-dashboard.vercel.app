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
  Legend,
} from "recharts"
import {
  getMarketPrices,
  upsertMarketPrice,
  deleteMarketPrice,
  type MarketPriceRow,
} from "@/app/actions/market-prices"
import { Loader2, Plus, Trash2, Search, Pencil } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

function formatJPY(n: number) {
  return `¥${(n / 10_000).toFixed(1)}万`
}

export function MarketPricesContent() {
  const [rows, setRows] = useState<MarketPriceRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MarketPriceRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const [formModel, setFormModel] = useState("")
  const [formBds, setFormBds] = useState("")
  const [formYahoo, setFormYahoo] = useState("")

  const load = async () => {
    setLoading(true)
    const res = await getMarketPrices()
    setLoading(false)
    if (res.success && res.rows) setRows(res.rows)
    else setError(res.error ?? null)
  }

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setEditing(null)
    setFormModel("")
    setFormBds("")
    setFormYahoo("")
    setFormOpen(true)
  }

  const openEdit = (row: MarketPriceRow) => {
    setEditing(row)
    setFormModel(row.model_name)
    setFormBds(row.bds_avg_jpy != null ? String(row.bds_avg_jpy) : "")
    setFormYahoo(row.yahoo_avg_jpy != null ? String(row.yahoo_avg_jpy) : "")
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    const model = formModel.trim()
    if (!model) {
      toast.error("車種・型式を入力してください")
      return
    }
    setSubmitting(true)
    const res = await upsertMarketPrice({
      model_name: model,
      bds_avg_jpy: formBds ? Number(formBds) || null : null,
      yahoo_avg_jpy: formYahoo ? Number(formYahoo) || null : null,
    })
    setSubmitting(false)
    if (res.success) {
      toast.success("相場を保存しました")
      setFormOpen(false)
      load()
    } else {
      toast.error(res.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("この相場を削除しますか？")) return
    setDeletingId(id)
    const res = await deleteMarketPrice(id)
    setDeletingId(null)
    if (res.success) {
      toast.success("削除しました")
      load()
    } else {
      toast.error(res.error)
    }
  }

  const openYahooSearch = (model: string) => {
    const url = `https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodeURIComponent(model)}&auccat=26316&ei=UTF-8`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const filtered = rows?.filter(
    (r) =>
      !search.trim() ||
      r.model_name.toLowerCase().includes(search.trim().toLowerCase())
  ) ?? []

  const chartData = filtered.slice(0, 20).map((r) => ({
    name: r.model_name.length > 10 ? r.model_name.slice(0, 10) + "…" : r.model_name,
    fullName: r.model_name,
    BDS: r.bds_avg_jpy ?? 0,
    ヤフオク: r.yahoo_avg_jpy ?? 0,
  }))

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
        <p className="mt-2 text-xs">
          Supabase で market_prices テーブルを作成してください。docs のマイグレーションを実行するか、SQL Editor で
          <code className="mx-1 rounded bg-muted px-1">20260228000000_market_prices.sql</code>
          の内容を実行してください。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="車種・型式で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 touch-manipulation"
        >
          <Plus className="h-4 w-4" />
          相場を追加
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="text-muted-foreground">相場データがありません</p>
          <p className="mt-2 text-sm text-muted-foreground">
            「相場を追加」から車種・型式ごとに BDS とヤフオクの落札相場を手入力してください。
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            最初の相場を追加
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-foreground">
              車種別 相場比較（BDS vs ヤフオク）
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              BDS とヤフオクの落札相場を車種ごとに比較。ヤフオクは検索リンクで落札相場を確認できます。
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
                      return p?.fullName ?? ""
                    }}
                  />
                  <Legend />
                  <Bar dataKey="BDS" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ヤフオク" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-foreground">相場一覧</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">車種・型式</th>
                    <th className="pb-2 pr-4 font-medium text-right">BDS 平均</th>
                    <th className="pb-2 pr-4 font-medium text-right">ヤフオク 平均</th>
                    <th className="pb-2 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border/70 hover:bg-muted/30">
                      <td className="py-2 pr-4 font-medium text-foreground">{r.model_name}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {r.bds_avg_jpy != null ? formatJPY(r.bds_avg_jpy) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {r.yahoo_avg_jpy != null ? formatJPY(r.yahoo_avg_jpy) : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openYahooSearch(r.model_name)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="ヤフオク落札相場を検索"
                          >
                            <Search className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="編集"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            className="rounded p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            title="削除"
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "相場を編集" : "相場を追加"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                車種・型式 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder="例: モンキー Z50J"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                disabled={!!editing}
              />
              {!editing && (
                <p className="mt-1 text-xs text-muted-foreground">
                  ヤフオク落札相場は
                  <a
                    href={`https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodeURIComponent(formModel || "バイク")}&auccat=26316&ei=UTF-8`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-primary hover:underline"
                  >
                    ヤフオク車体カテゴリ
                  </a>
                  で検索して確認できます。
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                BDS 平均落札額（円）
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={formBds}
                onChange={(e) => setFormBds(e.target.value)}
                placeholder="例: 85000"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                ヤフオク 平均落札額（円）
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={formYahoo}
                onChange={(e) => setFormYahoo(e.target.value)}
                placeholder="例: 120000"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !formModel.trim()}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  保存中…
                </>
              ) : (
                "保存"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
