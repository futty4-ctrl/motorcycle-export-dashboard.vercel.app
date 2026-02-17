"use client"

import { useRef, useState, useCallback } from "react"
import Link from "next/link"
import { Camera, Upload, ArrowLeft, CheckCircle2, ExternalLink, X } from "lucide-react"
import { uploadImagesBatchToDriveAndSave } from "@/app/actions/drive-upload"
import { toast } from "sonner"

type SelectedItem = {
  id: string
  file: File
  preview: string
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [lastResults, setLastResults] = useState<{ fileUrl: string; folderUrl: string }[]>([])

  const readFileAsBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const b64 = result.includes(",") ? result.split(",")[1] : result
        resolve(b64 ?? "")
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (imageFiles.length === 0) {
      toast.error("画像ファイルを選択してください")
      e.target.value = ""
      return
    }
    if (imageFiles.length < files.length) {
      toast.info(`${imageFiles.length}件の画像を選択しました（非画像は除いています）`)
    }
    const newItems: SelectedItem[] = imageFiles.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }))
    setSelectedItems((prev) => [...prev, ...newItems])
    setLastResults([])
    e.target.value = ""
  }

  function removePreview(id: string) {
    setSelectedItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  function clearAllPreviews() {
    selectedItems.forEach((i) => URL.revokeObjectURL(i.preview))
    setSelectedItems([])
    setLastResults([])
  }

  async function startUpload() {
    if (selectedItems.length === 0) {
      toast.error("画像を選択してください")
      return
    }
    setUploading(true)
    setLastResults([])
    setProgress(0)

    try {
      const base64List = await Promise.all(
        selectedItems.map((item) => readFileAsBase64(item.file))
      )

      const images = selectedItems.map((item, index) => ({
        imageBase64: base64List[index],
        mimeType: item.file.type,
        fileName: item.file.name,
      }))

      const res = await uploadImagesBatchToDriveAndSave({ images })
      setProgress(100)

      if (res.success && res.folderUrl && res.fileUrls?.length) {
        setLastResults(
          res.fileUrls.map((fileUrl) => ({
            fileUrl,
            folderUrl: res.folderUrl!,
          }))
        )
        clearAllPreviews()
        toast.success(
          `${res.fileUrls.length}件を1つのフォルダに保存しました`
        )
      } else {
        setProgress(0)
        toast.error(res.error ?? "アップロードに失敗しました")
      }
    } catch {
      setProgress(0)
      toast.error("アップロードに失敗しました")
    } finally {
      setUploading(false)
    }
  }

  function handleDropzoneClick() {
    if (uploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-dvh bg-background pb-safe">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground touch-manipulation"
            aria-label="ダッシュボードに戻る"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              写真を Drive にアップロード
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              複数枚選択可能。選択後にプレビューを確認してアップロードします
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="sr-only"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        <button
          type="button"
          onClick={handleDropzoneClick}
          disabled={uploading}
          className="flex min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 py-10 transition-colors active:bg-primary/10 disabled:opacity-60 touch-manipulation sm:min-h-[180px]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary sm:h-16 sm:w-16">
            {uploading ? (
              <Upload className="h-7 w-7 animate-pulse sm:h-8 sm:w-8" />
            ) : (
              <Camera className="h-7 w-7 sm:h-8 sm:w-8" />
            )}
          </span>
          <span className="text-base font-semibold text-foreground sm:text-lg">
            {uploading ? "アップロード中…" : "タップして画像を選択（複数可）"}
          </span>
        </button>

        {selectedItems.length > 0 && !uploading && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                選択中: {selectedItems.length}件
              </span>
              <button
                type="button"
                onClick={clearAllPreviews}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                すべて解除
              </button>
            </div>
            <ul className="grid max-h-[280px] grid-cols-3 gap-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-4">
              {selectedItems.map((item) => (
                <li
                  key={item.id}
                  className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePreview(item.id)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="削除"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1.5 py-0.5 text-xs text-white">
                    {item.file.name}
                  </p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={startUpload}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground touch-manipulation hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" />
              {selectedItems.length}件をアップロード
            </button>
          </div>
        )}

        {uploading && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>進捗</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {lastResults.length > 0 && !uploading && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 text-primary">
              <CheckCircle2 className="h-8 w-8 shrink-0" />
              <span className="font-semibold">{lastResults.length}件 保存完了</span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href={lastResults[0].folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-foreground touch-manipulation"
              >
                <span className="truncate">Drive で開く（先頭のフォルダ）</span>
                <ExternalLink className="h-5 w-5 shrink-0" />
              </a>
              <Link
                href="/"
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground touch-manipulation"
              >
                ダッシュボードに戻る
              </Link>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          親フォルダは環境変数 GOOGLE_DRIVE_PARENT_FOLDER_ID で指定します
        </p>
      </div>
    </div>
  )
}
