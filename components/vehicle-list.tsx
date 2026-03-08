"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { vehicles as fallbackVehicles, type VehicleStatus } from "@/lib/data"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import { VehicleCard } from "./vehicle-card"

const filters: (VehicleStatus | "すべて")[] = ["すべて", "仕入中", "査定中", "落札", "在庫あり", "出品中", "発送中", "売却済"]

type VehicleListProps = {
  /** Supabase / スプレッドシートから取得した車両一覧。未指定時はフォールバックデータを使用 */
  vehicles?: VehicleDisplay[] | null
  /** ヘッダー検索と連携する場合に渡す（URL ?q= と同期） */
  externalSearch?: string
  onExternalSearchChange?: (value: string) => void
}

export function VehicleList({
  vehicles: vehiclesProp,
  externalSearch,
  onExternalSearchChange,
}: VehicleListProps) {
  const [activeFilter, setActiveFilter] = useState<VehicleStatus | "すべて">("すべて")
  const [internalSearch, setInternalSearch] = useState("")
  const search = externalSearch ?? internalSearch
  const setSearch = onExternalSearchChange ?? setInternalSearch
  const vehicles: VehicleDisplay[] =
    vehiclesProp ??
    fallbackVehicles.map((v) => ({
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

  const byStatus =
    activeFilter === "すべて" ? vehicles : vehicles.filter((v) => v.status === activeFilter)
  const searchLower = search.trim().toLowerCase()
  const filteredVehicles = searchLower
    ? byStatus.filter(
        (v) =>
          v.name.toLowerCase().includes(searchLower) ||
          v.id.toLowerCase().includes(searchLower) ||
          (v.chassisNumber ?? "").toLowerCase().includes(searchLower)
      )
    : byStatus

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground sm:text-base lg:text-lg">
          車両パイプライン
        </h2>
        <span className="text-sm text-muted-foreground sm:text-xs">
          {filteredVehicles.length}台
        </span>
      </div>

      <div className="mt-3 flex min-h-[44px] items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 sm:mt-2 sm:min-h-0">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          placeholder="名前・ID・車体番号で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="車両検索"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:mt-3">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`min-h-[44px] shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation sm:min-h-0 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs ${
              activeFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:mt-4 sm:gap-3">
        {filteredVehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
        {filteredVehicles.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">車両が見つかりません</p>
          </div>
        )}
      </div>
    </section>
  )
}
