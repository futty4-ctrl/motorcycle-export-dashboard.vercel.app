"use client"

import { useState, useEffect, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Upload, Loader2, Trash2 } from "lucide-react"

const BUCKET = "vehicle-images"
const MAX_SIZE = 5 * 1024 * 1024

type Photo = { name: string; url: string }

export function InventoryPhotoUploader({
  managementCode,
}: {
  managementCode: string
}) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPhotos = async () => {
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(managementCode, { limit: 100, sortBy: { column: "name", order: "asc" } })
      if (error) throw error
      const items = (data ?? [])
        .filter((f) => !f.name.startsWith("."))
        .map((f) => {
          const path = `${managementCode}/${f.name}`
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
          return { name: f.name, url: pub.publicUrl }
        })
      setPhotos(items)
    } catch (e) {
      toast.error(`写真取得失敗: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managementCode])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    const supabase = createSupabaseBrowserClient()
    let ok = 0
    let err = 0
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} は5MBを超えています`)
        err++
        continue
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const ts = Date.now()
      const path = `${managementCode}/photo-${ts}-${ok}.${ext}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) {
        toast.error(`${file.name}: ${error.message}`)
        err++
      } else {
        ok++
      }
    }
    setUploading(false)
    if (ok > 0) toast.success(`${ok}枚アップロード完了`)
    if (err === 0 || ok > 0) loadPhotos()
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`${name} を削除しますか？`)) return
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([`${managementCode}/${name}`])
    if (error) {
      toast.error(`削除失敗: ${error.message}`)
    } else {
      toast.success("削除完了")
      setPhotos((prev) => prev.filter((p) => p.name !== name))
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary touch-manipulation disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "アップロード中..." : "写真を追加"}
        </button>
        <span className="text-xs text-muted-foreground">
          {photos.length}枚
        </span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">読み込み中...</div>
      ) : photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          写真はまだありません。「写真を追加」から複数枚まとめて選択できます。
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.name} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <img
                src={p.url}
                alt={p.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => handleDelete(p.name)}
                aria-label="削除"
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground focus:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
