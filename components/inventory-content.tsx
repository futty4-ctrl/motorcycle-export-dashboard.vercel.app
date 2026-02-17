"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  getVehiclesFromSupabase,
  getPartsForInventory,
  updateVehicleStatus,
  type InventoryPartRow,
} from "@/app/actions/vehicles"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import type { VehicleStatus } from "@/lib/data"
import { getProfitBarColorClass, getProfitBarTrackClass } from "@/lib/vehicle-display"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Loader2, Package, Car, Search, ExternalLink } from "lucide-react"
import { toast } from "sonner"

const STATUSES: VehicleStatus[] = ["仕入中", "落札", "在庫あり", "出品中", "発送中", "売却済"]

export function InventoryContent() {
  const [vehicles, setVehicles] = useState<VehicleDisplay[] | null>(null)
  const [parts, setParts] = useState<InventoryPartRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"vehicles" | "parts">("vehicles")
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "すべて">("すべて")
  const [search, setSearch] = useState("")
  const [partSearch, setPartSearch] = useState("")
  const [storageFilter, setStorageFilter] = useState<string>("すべて")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [wonDialogVehicleId, setWonDialogVehicleId] = useState<string | null>(null)
  const [wonPriceJpy, setWonPriceJpy] = useState(0)
  const [wonCounterparty, setWonCounterparty] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const [vRes, pRes] = await Promise.all([
        getVehiclesFromSupabase(),
        getPartsForInventory(),
      ])
      if (cancelled) return
      if (vRes.success && vRes.vehicles) setVehicles(vRes.vehicles)
      else if (!vRes.success) setError(vRes.error ?? null)
      if (pRes.success && pRes.parts) setParts(pRes.parts)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleStatusChange(vehicleId: string, newStatus: VehicleStatus) {
    if (newStatus === "落札") {
      setWonDialogVehicleId(vehicleId)
      setWonPriceJpy(0)
      setWonCounterparty("")
      return
    }
    setUpdatingId(vehicleId)
    const res = await updateVehicleStatus(vehicleId, newStatus)
    setUpdatingId(null)
    if (res.success) {
      setVehicles((prev) =>
        prev?.map((v) => (v.id === vehicleId ? { ...v, status: newStatus } : v)) ?? null
      )
      toast.success("ステータスを更新しました")
    } else toast.error(res.error)
  }

  async function handleWonSubmit() {
    if (!wonDialogVehicleId) return
    setUpdatingId(wonDialogVehicleId)
    const res = await updateVehicleStatus(wonDialogVehicleId, "落札", {
      kobutsucho: { priceJpy: wonPriceJpy, counterparty: wonCounterparty },
    })
    setUpdatingId(null)
    if (res.success) {
      setVehicles((prev) =>
        prev?.map((v) =>
          v.id === wonDialogVehicleId ? { ...v, status: "落札" as VehicleStatus } : v
        ) ?? null
      )
      setWonDialogVehicleId(null)
      toast.success("ステータスを落札に更新し、古物台帳に1行追加しました")
    } else toast.error(res.error)
  }

  if (loading) {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>読み込み中…</span>
      </div>
    )
  }

  const statusCounts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: (vehicles ?? []).filter((v) => v.status === s).length }),
    {} as Record<VehicleStatus, number>
  )
  const byStatus =
    statusFilter === "すべて"
      ? vehicles ?? []
      : (vehicles ?? []).filter((v) => v.status === statusFilter)
  const searchLower = search.trim().toLowerCase()
  const filteredVehicles = searchLower
    ? byStatus.filter(
        (v) =>
          v.name.toLowerCase().includes(searchLower) ||
          v.id.toLowerCase().includes(searchLower) ||
          (v.chassisNumber ?? "").toLowerCase().includes(searchLower)
      )
    : byStatus

  const storageLocations = Array.from(
    new Set((parts ?? []).map((p) => p.storage_location || "（未設定）").filter(Boolean))
  ).sort()
  const partsByStorage =
    storageFilter === "すべて"
      ? parts ?? []
      : (parts ?? []).filter(
          (p) => (p.storage_location || "（未設定）") === storageFilter
        )
  const partSearchLower = partSearch.trim().toLowerCase()
  const filteredParts = partSearchLower
    ? partsByStorage.filter(
        (p) =>
          p.part_name.toLowerCase().includes(partSearchLower) ||
          (p.vehicle_chassis_number ?? "").toLowerCase().includes(partSearchLower)
      )
    : partsByStorage

  return (
    <div className="mt-6 space-y-6">
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("vehicles")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "vehicles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Car className="h-4 w-4" />
          車両在庫
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {(vehicles ?? []).length}台
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("parts")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "parts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="h-4 w-4" />
          パーツ在庫
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {(parts ?? []).length}件
          </span>
        </button>
      </div>

      {activeTab === "vehicles" && (
        <>
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">ステータス別 台数</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s} {statusCounts[s] ?? 0}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStatusFilter("すべて")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === "すべて"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                すべて {(vehicles ?? []).length}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              placeholder="名前・ID・車体番号で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 font-semibold text-foreground">車両</th>
                    <th className="px-4 py-3 font-semibold text-foreground">ステータス</th>
                    <th className="px-4 py-3 font-semibold text-foreground">利益スコア</th>
                    <th className="px-4 py-3 font-semibold text-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v) => (
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
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={v.status}
                          onChange={(e) =>
                            handleStatusChange(v.id, e.target.value as VehicleStatus)
                          }
                          disabled={updatingId === v.id}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {updatingId === v.id && (
                          <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-14 overflow-hidden rounded-full ${
                              getProfitBarTrackClass(v.profitScore)
                            }`}
                          >
                            <div
                              className={`h-full rounded-full ${getProfitBarColorClass(v.profitScore)}`}
                              style={{ width: `${v.profitScore}%` }}
                            />
                          </div>
                          <span className="text-xs">{v.profitScore}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/vehicle/${v.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredVehicles.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                車両がありません
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "parts" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 min-w-[200px]">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="search"
                placeholder="パーツ名・車体番号で検索"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={storageFilter}
              onChange={(e) => setStorageFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="すべて">保管場所: すべて</option>
              {storageLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 font-semibold text-foreground">パーツ名</th>
                    <th className="px-4 py-3 font-semibold text-foreground">保管場所</th>
                    <th className="px-4 py-3 font-semibold text-foreground">数量</th>
                    <th className="px-4 py-3 font-semibold text-foreground">紐づく車両</th>
                    <th className="px-4 py-3 font-semibold text-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium">{p.part_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.storage_location || "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">×{p.quantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.vehicle_chassis_number || `車両 ${p.vehicle_id.slice(0, 8)}`}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/vehicle/${p.vehicle_id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          車両詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredParts.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                パーツがありません。車両詳細ページでパーツを追加するとここに表示されます。
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Dialog open={!!wonDialogVehicleId} onOpenChange={(open) => !open && setWonDialogVehicleId(null)}>
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
              onClick={() => setWonDialogVehicleId(null)}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleWonSubmit}
              disabled={updatingId !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updatingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              古物台帳に追加して落札にする
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
