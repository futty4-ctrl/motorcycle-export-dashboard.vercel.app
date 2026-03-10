"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, useState } from "react"
import { MoreHorizontal, Camera, Loader2, Trash2 } from "lucide-react"
import type { VehicleDisplay } from "@/lib/vehicle-display"
import {
  getProfitBarColorClass,
  getProfitBarTrackClass,
} from "@/lib/vehicle-display"
import type { VehicleStatus } from "@/lib/data"
import { uploadVehiclePhoto, deleteVehicle } from "@/app/actions/vehicles"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

function getStatusStyle(status: VehicleStatus) {
  switch (status) {
    case "仕入中":
      return "bg-chart-3/15 text-chart-3 border-chart-3/30"
    case "査定中":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
    case "落札":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
    case "在庫あり":
      return "bg-primary/15 text-primary border-primary/30"
    case "出品中":
      return "bg-accent/15 text-accent border-accent/30"
    case "売却済":
      return "bg-muted text-muted-foreground border-border"
    case "発送中":
      return "bg-chart-5/15 text-chart-5 border-chart-5/30"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function formatJPY(value: number) {
  return `¥${value.toLocaleString()}`
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

function formatUSD(value: number) {
  return `$${value.toLocaleString()}`
}

const FALLBACK_IMAGE = "/bikes/placeholder.svg"

type VehicleCardProps = {
  vehicle: VehicleDisplay
  canDelete?: boolean
  onVehicleDeleted?: (vehicleId: string) => void
}

export function VehicleCard({ vehicle, canDelete, onVehicleDeleted }: VehicleCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [imageSrc, setImageSrc] = useState(vehicle.image?.trim() || FALLBACK_IMAGE)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteVehicle(vehicle.id)
    setDeleting(false)
    setDeleteOpen(false)
    if (res.success) {
      toast.success("車両を削除しました")
      onVehicleDeleted?.(vehicle.id)
    } else {
      toast.error(res.error)
    }
  }

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !vehicle.driveLink) return
    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.includes(",") ? result.split(",")[1] : result
          resolve(base64 ?? "")
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await uploadVehiclePhoto(vehicle.id, base64, file.type)
      if (res.success) {
        toast.success("写真を Drive にアップロードしました")
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error("アップロードに失敗しました")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  return (
    <>
    <Link href={`/vehicle/${vehicle.id}`} className="block">
      <div className="group rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
        <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-28 lg:h-24 lg:w-24">
            {imageSrc.startsWith("http://") || imageSrc.startsWith("https://") ? (
              // ブックマークレットで保存したBDS画像はホットリンクでブロックされるためプロキシ経由で表示
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
                sizes="(max-width: 640px) 96px, 112px, 96px"
                onError={() => setImageSrc(FALLBACK_IMAGE)}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-card-foreground sm:text-lg lg:text-base">
                {vehicle.name}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground sm:text-base">
                {[
                  vehicle.year != null ? `${vehicle.year}年` : null,
                  vehicle.mileage ?? null,
                  (vehicle.auctionGrade ?? vehicle.bdsRating)
                    ? `評価 ${vehicle.auctionGrade ?? vehicle.bdsRating}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ・ ") || "—"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {vehicle.driveLink && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handlePhotoCapture}
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                    disabled={uploading}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-primary transition-opacity hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 sm:h-9 sm:w-9"
                    aria-label="写真を撮って Drive にアップロード"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
                    ) : (
                      <Camera className="h-5 w-5 sm:h-4 sm:w-4" />
                    )}
                  </button>
                </>
              )}
              {canDelete ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-opacity hover:bg-secondary hover:text-foreground focus:opacity-100 sm:h-9 sm:w-9"
                      aria-label={`${vehicle.name}のオプション（削除）`}
                    >
                      <MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus:opacity-100 group-hover:opacity-100 sm:h-9 sm:w-9"
                  aria-label={`${vehicle.name}のオプション`}
                >
                  <MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-medium sm:text-xs ${getStatusStyle(vehicle.status)}`}
            >
              {vehicle.status}
            </span>
            {vehicle.createdAt && (
              <span className="text-xs text-muted-foreground">
                登録 {formatCreatedAt(vehicle.createdAt)}
              </span>
            )}
          </div>

          <div className="mt-3 sm:mt-2">
            <div className="flex items-center justify-between text-sm sm:text-xs">
              <span className="text-muted-foreground">利益スコア</span>
              <span className="font-semibold text-card-foreground sm:font-medium">
                {vehicle.profitScore}%
              </span>
            </div>
            <div
              className={`mt-1.5 h-2 w-full overflow-hidden rounded-full sm:mt-1 sm:h-1.5 ${getProfitBarTrackClass(vehicle.profitScore)}`}
            >
              <div
                className={`h-full rounded-full transition-all ${getProfitBarColorClass(vehicle.profitScore)}`}
                style={{ width: `${vehicle.profitScore}%` }}
              />
            </div>
          </div>
        </div>
        </div>
      </div>
      <div className="border-t border-border px-3 py-3 sm:px-4 sm:py-2">
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground sm:text-xs">予想利益</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-card-foreground sm:text-sm">
                {formatJPY(vehicle.expectedProfitJPY)}
              </span>
              {vehicle.expectedProfitUSD != null && vehicle.expectedProfitUSD > 0 && (
                <span className="text-sm text-muted-foreground sm:text-xs">
                  ({formatUSD(vehicle.expectedProfitUSD)})
                </span>
              )}
          </div>
        </div>
      </div>
    </Link>

    {canDelete && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>車両を削除しますか？</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {vehicle.name} を削除すると、査定・シナリオ・パーツ・Bad Case もすべて削除され、復元できません。
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
    )}
    </>
  )
}
