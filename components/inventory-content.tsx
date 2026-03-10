"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Car, Loader2, Package } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import {
  fetchInventoryItems,
  insertInventoryItem,
  updateInventoryItemStatus,
  type InventoryItemRow,
} from "@/lib/inventory-supabase"
import { toast } from "sonner"

const STATUSES = ["未処理", "出品準備中", "ヤフオク出品中", "売約済み"] as const
const CATEGORIES = ["車体", "パーツ"] as const

const STATUS_BADGE_CLASS: Record<string, string> = {
  未処理: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40",
  出品準備中: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40",
  ヤフオク出品中: "bg-primary/20 text-primary border-primary/40",
  売約済み: "bg-muted text-muted-foreground border-border",
}

function formatJPY(n: number): string {
  return `¥${n.toLocaleString()}`
}

function getVehicleDisplayName(item: InventoryItemRow): string {
  const parts = [item.maker, item.model_name, item.model_type].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "（未入力）"
}

export function InventoryContent() {
  const [items, setItems] = useState<InventoryItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("すべて")
  const [submitting, setSubmitting] = useState(false)
  const [createdItem, setCreatedItem] = useState<InventoryItemRow | null>(null)

  // 在庫・車両情報
  const [category, setCategory] = useState<"車体" | "パーツ">("車体")
  const [maker, setMaker] = useState("")
  const [modelName, setModelName] = useState("")
  const [modelType, setModelType] = useState("")
  const [chassisNumber, setChassisNumber] = useState("")
  const [purchasePrice, setPurchasePrice] = useState<string>("")
  const [conditionMemo, setConditionMemo] = useState("")

  // 古物台帳（受入）
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [sellerName, setSellerName] = useState("")
  const [sellerAge, setSellerAge] = useState("")
  const [sellerAddress, setSellerAddress] = useState("")
  const [sellerOccupation, setSellerOccupation] = useState("")
  const [idVerificationMethod, setIdVerificationMethod] = useState("")

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchInventoryItems()
    if (err) {
      setError(err.message)
      setItems([])
    } else if (data) {
      setItems(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  function resetForm() {
    setCategory("車体")
    setMaker("")
    setModelName("")
    setModelType("")
    setChassisNumber("")
    setPurchasePrice("")
    setConditionMemo("")
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setSellerName("")
    setSellerAge("")
    setSellerAddress("")
    setSellerOccupation("")
    setIdVerificationMethod("")
    setCreatedItem(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { data, error: err } = await insertInventoryItem({
      purchase_date: purchaseDate,
      category,
      maker: maker.trim() || null,
      model_name: modelName.trim() || null,
      model_type: modelType.trim() || null,
      chassis_number: chassisNumber.trim() || null,
      purchase_price: Number(purchasePrice) || 0,
      condition_memo: conditionMemo.trim() || null,
      seller_name: sellerName.trim() || null,
      seller_age: sellerAge.trim() || null,
      seller_address: sellerAddress.trim() || null,
      seller_occupation: sellerOccupation.trim() || null,
      id_verification: idVerificationMethod.trim() || null,
    })
    setSubmitting(false)

    if (err) {
      toast.error(err.message)
      return
    }

    if (data) {
      setCreatedItem(data)
      setItems((prev) => [data, ...prev])
      toast.success(`${data.management_code} を登録しました`)
    }
  }

  function handleCloseSuccess() {
    resetForm()
    setFormOpen(false)
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const { error: err } = await updateInventoryItemStatus(id, newStatus)
    if (err) {
      toast.error(err.message)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    )
    toast.success("ステータスを更新しました")
  }

  const filtered =
    statusFilter === "すべて"
      ? items
      : items.filter((i) => i.status === statusFilter)

  const detailUrl =
    typeof window !== "undefined" && createdItem
      ? `${window.location.origin}/inventory/${createdItem.management_code}`
      : ""

  if (loading && items.length === 0) {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>読み込み中…</span>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
          <p className="mt-1 text-xs">
            Supabase の RLS ポリシー設定が必要な場合は、docs/inventory_rls_policies.sql を SQL Editor で実行してください。
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          resetForm()
          setFormOpen(true)
        }}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground touch-manipulation"
      >
        <Plus className="h-5 w-5" />
        新規登録
      </button>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">ステータス</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("すべて")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium touch-manipulation ${
              statusFilter === "すべて"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/50 text-muted-foreground"
            }`}
          >
            すべて
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium touch-manipulation ${
                statusFilter === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          在庫一覧（{filtered.length}件）
        </h2>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
            在庫がありません。「新規登録」から追加してください。
          </div>
        ) : (
          <>
            <div className="space-y-3 sm:hidden">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <Link
                    href={`/inventory/${item.management_code}`}
                    className="min-w-0 flex-1 active:opacity-90"
                  >
                    <div className="flex items-center gap-2">
                      {item.category === "車体" ? (
                        <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-foreground">
                        {item.management_code}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE_CLASS[item.status] ??
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-foreground">
                      {getVehicleDisplayName(item)}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {item.purchase_price && item.purchase_price > 0
                        ? formatJPY(item.purchase_price)
                        : "—"}
                    </p>
                  </Link>
                  <select
                    value={item.status}
                    onChange={(e) =>
                      handleStatusChange(item.id, e.target.value)
                    }
                    className="min-h-[36px] rounded-lg border border-input bg-background px-2 py-1.5 text-xs touch-manipulation"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-border bg-card sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 font-semibold text-foreground">
                        管理番号
                      </th>
                      <th className="px-4 py-3 font-semibold text-foreground">
                        車名
                      </th>
                      <th className="px-4 py-3 font-semibold text-foreground">
                        仕入価格
                      </th>
                      <th className="px-4 py-3 font-semibold text-foreground">
                        ステータス
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/inventory/${item.management_code}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {item.management_code}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {getVehicleDisplayName(item)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {item.purchase_price && item.purchase_price > 0
                            ? formatJPY(item.purchase_price)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                STATUS_BADGE_CLASS[item.status] ??
                                "bg-muted text-muted-foreground"
                              }`}
                            >
                              {item.status}
                            </span>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value)
                              }
                              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
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
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>在庫を登録</DialogTitle>
          </DialogHeader>

          {createdItem ? (
            <div className="space-y-6 py-4">
              <p className="text-sm text-muted-foreground">
                登録が完了しました。管理番号とQRコードを印刷して車体に貼り付けてください。
              </p>
              <div className="flex flex-col items-center gap-4">
                <p className="font-mono text-xl font-bold text-foreground">
                  {createdItem.management_code}
                </p>
                <div className="rounded-lg border border-border bg-white p-4">
                  <QRCodeSVG
                    value={detailUrl}
                    size={200}
                    level="M"
                    includeMargin
                  />
                </div>
                <p className="max-w-full truncate text-xs text-muted-foreground">
                  {detailUrl}
                </p>
              </div>
              <DialogFooter>
                <button
                  type="button"
                  onClick={handleCloseSuccess}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground touch-manipulation"
                >
                  閉じる
                </button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="inventory" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inventory" className="text-xs sm:text-sm">
                    在庫情報
                  </TabsTrigger>
                  <TabsTrigger value="kobutsucho" className="text-xs sm:text-sm">
                    古物情報
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="inventory" className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      カテゴリ
                    </label>
                    <div className="mt-2 flex gap-4">
                      {CATEGORIES.map((c) => (
                        <label
                          key={c}
                          className="flex cursor-pointer items-center gap-2 touch-manipulation"
                        >
                          <input
                            type="radio"
                            name="category"
                            value={c}
                            checked={category === c}
                            onChange={() => setCategory(c)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      メーカー
                    </label>
                    <input
                      type="text"
                      placeholder="例: Honda"
                      value={maker}
                      onChange={(e) => setMaker(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      車名
                    </label>
                    <input
                      type="text"
                      placeholder="例: モンキー"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      型式
                    </label>
                    <input
                      type="text"
                      placeholder="例: Z50J"
                      value={modelType}
                      onChange={(e) => setModelType(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      車台番号
                    </label>
                    <input
                      type="text"
                      placeholder="例: Z50J-1234567"
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      仕入価格（円）
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      状態メモ
                    </label>
                    <textarea
                      placeholder="実働、キック降りる、欠品あり等"
                      value={conditionMemo}
                      onChange={(e) => setConditionMemo(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation resize-none"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="kobutsucho" className="mt-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    古物営業法に基づく受入情報（警察対応用）
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      仕入日
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      required
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      相手の氏名
                    </label>
                    <input
                      type="text"
                      placeholder="譲渡人の氏名"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      相手の年齢
                    </label>
                    <input
                      type="text"
                      placeholder="例: 45歳"
                      value={sellerAge}
                      onChange={(e) => setSellerAge(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      相手の住所
                    </label>
                    <input
                      type="text"
                      placeholder="住所"
                      value={sellerAddress}
                      onChange={(e) => setSellerAddress(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      相手の職業
                    </label>
                    <input
                      type="text"
                      placeholder="職業"
                      value={sellerOccupation}
                      onChange={(e) => setSellerOccupation(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      本人確認方法
                    </label>
                    <input
                      type="text"
                      placeholder="例: 運転免許証"
                      value={idVerificationMethod}
                      onChange={(e) => setIdVerificationMethod(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2 sm:gap-0 pt-4">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium touch-manipulation"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground touch-manipulation disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      保存中…
                    </>
                  ) : (
                    "登録する"
                  )}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
