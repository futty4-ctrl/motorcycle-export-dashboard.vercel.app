"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Upload, Car, Loader2, Trash2, Copy, Download } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  fetchInventoryItemByManagementCode,
  updateInventoryItemStatus,
  deleteInventoryItem,
  type InventoryItemRow,
} from "@/lib/inventory-supabase"
import { toast } from "sonner"

const STATUSES = ["未処理", "出品準備中", "ヤフオク出品中", "売約済み"] as const

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
  return parts.length > 0 ? parts.join(" ") : "—"
}

const PLACEHOLDER_IMAGE = "/bikes/placeholder.svg"

export function InventoryDetailContent({
  managementCode,
}: {
  managementCode: string
}) {
  const router = useRouter()
  const [item, setItem] = useState<InventoryItemRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailUrl, setDetailUrl] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchInventoryItemByManagementCode(managementCode).then(({ data, error }) => {
      if (!cancelled && data) {
        setItem(data)
      }
      if (!cancelled) setLoading(false)
    })
    if (typeof window !== "undefined") {
      setDetailUrl(`${window.location.origin}/inventory/${managementCode}`)
    }
    return () => {
      cancelled = true
    }
  }, [managementCode])

  async function handleStatusChange(newStatus: string) {
    if (!item) return
    const { error } = await updateInventoryItemStatus(item.id, newStatus)
    if (error) {
      toast.error(error.message)
      return
    }
    setItem((prev) => (prev ? { ...prev, status: newStatus } : null))
    toast.success("ステータスを更新しました")
  }

  function handleMockUpload() {
    toast.info("画像アップロードは準備中です（Supabase Storage連携予定）")
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(detailUrl)
      toast.success("コピーしました！")
    } catch {
      toast.error("コピーに失敗しました")
    }
  }

  function handleDownloadQrImage() {
    const container = qrContainerRef.current
    const svg = container?.querySelector("svg")
    if (!svg) return
    try {
      const svgData = new XMLSerializer().serializeToString(svg)
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const size = 512
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          URL.revokeObjectURL(url)
          return
        }
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(img, 0, 0, size, size)
        const a = document.createElement("a")
        a.href = canvas.toDataURL("image/png")
        a.download = `${managementCode}.png`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("画像を保存しました")
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        toast.error("画像の保存に失敗しました")
      }
      img.src = url
    } catch {
      toast.error("画像の保存に失敗しました")
    }
  }

  async function handleDelete() {
    if (!item) return
    setDeleting(true)
    const { error } = await deleteInventoryItem(item.id)
    setDeleting(false)
    setDeleteOpen(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`${item.management_code} を削除しました`)
    router.push("/inventory")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>読み込み中…</span>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-muted-foreground">
          データが見つかりません。管理番号を確認してください。
        </p>
        <Link
          href="/inventory"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          在庫一覧へ
        </Link>
      </div>
    )
  }

  const images = [PLACEHOLDER_IMAGE]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
            STATUS_BADGE_CLASS[item.status] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {item.status}
        </span>
        <select
          value={item.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="min-h-[36px] rounded-lg border border-input bg-background px-3 py-1.5 text-sm touch-manipulation"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* 画像カルーセル（モック） */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="relative aspect-video bg-muted">
          {images.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((src, i) => (
                  <CarouselItem key={i}>
                    <div className="relative aspect-video w-full bg-muted">
                      <Image
                        src={src}
                        alt={`写真 ${i + 1}`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 600px"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              写真なし
            </div>
          )}
          <button
            type="button"
            onClick={handleMockUpload}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-background/90 px-4 py-2 text-sm font-medium shadow-md backdrop-blur touch-manipulation"
          >
            <Upload className="h-4 w-4" />
            写真を追加
          </button>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Car className="h-5 w-5" />
          基本情報
        </h2>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-xs text-muted-foreground">管理番号</dt>
            <dd className="font-mono font-semibold">{item.management_code}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">車台番号</dt>
            <dd className="font-mono">{item.chassis_number || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">メーカー・車名・型式</dt>
            <dd>{getVehicleDisplayName(item)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">仕入日</dt>
            <dd>{item.purchase_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">仕入価格</dt>
            <dd className="tabular-nums">
              {item.purchase_price && item.purchase_price > 0
                ? formatJPY(item.purchase_price)
                : "—"}
            </dd>
          </div>
          {item.condition_memo && (
            <div>
              <dt className="text-xs text-muted-foreground">状態メモ</dt>
              <dd className="whitespace-pre-wrap text-sm">{item.condition_memo}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* 古物台帳・受入情報 */}
      {(item.seller_name ||
        item.seller_age ||
        item.seller_address ||
        item.seller_occupation ||
        item.id_verification_method) && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-foreground">
            古物台帳・受入情報
          </h2>
          <dl className="mt-4 space-y-3">
            {item.seller_name && (
              <div>
                <dt className="text-xs text-muted-foreground">相手の氏名</dt>
                <dd>{item.seller_name}</dd>
              </div>
            )}
            {item.seller_age && (
              <div>
                <dt className="text-xs text-muted-foreground">相手の年齢</dt>
                <dd>{item.seller_age}</dd>
              </div>
            )}
            {item.seller_address && (
              <div>
                <dt className="text-xs text-muted-foreground">相手の住所</dt>
                <dd className="whitespace-pre-wrap text-sm">
                  {item.seller_address}
                </dd>
              </div>
            )}
            {item.seller_occupation && (
              <div>
                <dt className="text-xs text-muted-foreground">相手の職業</dt>
                <dd>{item.seller_occupation}</dd>
              </div>
            )}
            {item.id_verification_method && (
              <div>
                <dt className="text-xs text-muted-foreground">本人確認方法</dt>
                <dd>{item.id_verification_method}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* QRコード */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-foreground">QRコード</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          この車体の詳細ページURL。印刷して車体に貼り付けて個体管理にご利用ください。
        </p>
        <div className="mt-4 flex flex-col items-center gap-4">
          <div ref={qrContainerRef} className="rounded-lg border border-border bg-white p-4">
            <QRCodeSVG
              value={detailUrl}
              size={180}
              level="M"
              includeMargin
            />
          </div>
          <p className="max-w-full truncate text-xs text-muted-foreground">
            {detailUrl}
          </p>
          <div className="flex flex-wrap justify-center gap-2 w-full">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted touch-manipulation"
            >
              <Copy className="h-4 w-4" />
              URLをコピー
            </button>
            <button
              type="button"
              onClick={handleDownloadQrImage}
              className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted touch-manipulation"
            >
              <Download className="h-4 w-4" />
              画像を保存
            </button>
          </div>
        </div>
      </div>

      {/* 削除 */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-foreground">危険な操作</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          この在庫を削除すると、データは復元できません。
        </p>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20 touch-manipulation"
        >
          <Trash2 className="h-4 w-4" />
          この在庫を削除
        </button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>在庫を削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {item?.management_code} を削除すると、データは復元できません。よろしいですか？
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
              onClick={handleDelete}
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
    </div>
  )
}
