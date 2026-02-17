"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addVehicleWithInitialData } from "@/app/actions/vehicles"
import type { BdsScreenshotExtract } from "@/lib/ai/bds-screenshot-analyzer"

const MAX_FILES = 3
const ACCEPT = "image/*,application/pdf"

function emptyStr(s: string | null | undefined): string {
  return s ?? ""
}

export function ScreenshotUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  /** 選択済みファイル（サムネイル表示・解析開始前） */
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [form, setForm] = useState<BdsScreenshotExtract>({
    lotNumber: null,
    vehicleName: null,
    modelYear: null,
    displacement: null,
    frameNumber: null,
    overallGrade: null,
    engineGrade: null,
    frameGrade: null,
    electricGrade: null,
    legGrade: null,
    exteriorGrade: null,
    specialNotes: null,
  })

  const runAnalysis = useCallback(async (files: File[]) => {
    const list = files.slice(0, MAX_FILES)
    if (list.length === 0) return
    setAnalyzing(true)
    setAnalyzeError(null)
    setSelectedFiles([])
    try {
      const formData = new FormData()
      list.forEach((file) => formData.append("image", file))
      const res = await fetch("/api/vehicles/analyze-screenshot", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? "解析に失敗しました")
      }
      setForm({
        lotNumber: data.lotNumber ?? null,
        vehicleName: data.vehicleName ?? null,
        modelYear: data.modelYear ?? null,
        displacement: data.displacement ?? null,
        frameNumber: data.frameNumber ?? null,
        overallGrade: data.overallGrade ?? null,
        engineGrade: data.engineGrade ?? null,
        frameGrade: data.frameGrade ?? null,
        electricGrade: data.electricGrade ?? null,
        legGrade: data.legGrade ?? null,
        exteriorGrade: data.exteriorGrade ?? null,
        specialNotes: data.specialNotes ?? null,
      })
      setModalOpen(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "解析に失敗しました"
      setAnalyzeError(msg)
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const items = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    )
    if (items.length) setSelectedFiles(items.slice(0, MAX_FILES))
  }, [])
  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])
  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length) {
      const list = Array.from(files).filter(
        (f) => f.type.startsWith("image/") || f.type === "application/pdf"
      )
      if (list.length) setSelectedFiles(list.slice(0, MAX_FILES))
    }
    e.target.value = ""
  }, [])
  const startAnalysis = useCallback(() => {
    if (selectedFiles.length) runAnalysis(selectedFiles)
  }, [selectedFiles, runAnalysis])
  const clearSelection = useCallback(() => setSelectedFiles([]), [])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const result = await addVehicleWithInitialData({
        vehicleName: form.vehicleName || undefined,
        modelYear: form.modelYear || undefined,
        frameNumber: form.frameNumber || undefined,
        overallGrade: form.overallGrade || undefined,
        specialNotes: form.specialNotes || undefined,
      })
      if (result.success) {
        toast.success("車両を登録しました", { description: result.message })
        setModalOpen(false)
        router.refresh()
      } else {
        toast.error(result.error ?? "登録に失敗しました")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-5 text-center transition-colors hover:border-muted-foreground/50 hover:bg-muted/50"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={onFileSelect}
          className="absolute h-0 w-0 opacity-0"
          id="screenshot-upload"
          disabled={analyzing}
          aria-label="BDSスクショまたはPDFを選択"
        />
        {analyzing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-center text-sm font-medium text-muted-foreground">
              複数枚の画像を統合解析中...（10〜15秒ほどかかります）
            </p>
          </div>
        ) : selectedFiles.length > 0 ? (
          <div className="w-full space-y-3">
            <p className="text-sm font-medium text-foreground">
              選択中: {selectedFiles.length} 件
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {selectedFiles.map((file, i) => (
                <div
                  key={i}
                  className="h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted object-cover shadow-sm"
                >
                  {file.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`プレビュー ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      PDF
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={startAnalysis}
                className="min-h-11 min-w-[140px] touch-manipulation"
              >
                解析開始
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearSelection}
                className="touch-manipulation"
              >
                やり直す
              </Button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="screenshot-upload"
            className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50 active:bg-muted touch-manipulation"
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              ファイルをアップロード
            </span>
            <span className="text-xs text-muted-foreground">
              写真を撮る / アルバムから選択 / PDF も可
            </span>
            <span className="text-xs text-muted-foreground">
              1枚〜3枚まで（複数枚は1台分として統合解析）
            </span>
          </label>
        )}
        {analyzeError && (
          <p className="mt-2 text-xs text-destructive">{analyzeError}</p>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新規車両登録（BDS解析結果）</DialogTitle>
            <DialogDescription>
              内容を確認・修正して「登録」で車両を追加します。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bds-vehicleName">車種名</Label>
                <Input
                  id="bds-vehicleName"
                  value={emptyStr(form.vehicleName)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vehicleName: e.target.value || null }))
                  }
                  placeholder="例: モンキー"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bds-modelYear">年式</Label>
                <Input
                  id="bds-modelYear"
                  value={emptyStr(form.modelYear)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modelYear: e.target.value || null }))
                  }
                  placeholder="例: 2023"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bds-frameNumber">車体番号</Label>
                <Input
                  id="bds-frameNumber"
                  value={emptyStr(form.frameNumber)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frameNumber: e.target.value || null }))
                  }
                  placeholder="車体番号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bds-overallGrade">総合評価</Label>
                <Input
                  id="bds-overallGrade"
                  value={emptyStr(form.overallGrade)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, overallGrade: e.target.value || null }))
                  }
                  placeholder="例: 4, R"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bds-lotNumber">出品番号</Label>
                <Input
                  id="bds-lotNumber"
                  value={emptyStr(form.lotNumber)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lotNumber: e.target.value || null }))
                  }
                  placeholder="ロット番号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bds-displacement">排気量</Label>
                <Input
                  id="bds-displacement"
                  value={emptyStr(form.displacement)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, displacement: e.target.value || null }))
                  }
                  placeholder="例: 125cc"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bds-engineGrade">エンジン</Label>
                <Input
                  id="bds-engineGrade"
                  value={emptyStr(form.engineGrade)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, engineGrade: e.target.value || null }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bds-frameGrade">フレーム</Label>
                <Input
                  id="bds-frameGrade"
                  value={emptyStr(form.frameGrade)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frameGrade: e.target.value || null }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bds-exteriorGrade">外装</Label>
                <Input
                  id="bds-exteriorGrade"
                  value={emptyStr(form.exteriorGrade)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, exteriorGrade: e.target.value || null }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bds-electricGrade">電装</Label>
                <Input
                  id="bds-electricGrade"
                  value={emptyStr(form.electricGrade)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, electricGrade: e.target.value || null }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bds-legGrade">足回り</Label>
                <Input
                  id="bds-legGrade"
                  value={emptyStr(form.legGrade)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, legGrade: e.target.value || null }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bds-specialNotes">特記事項・コメント</Label>
              <Textarea
                id="bds-specialNotes"
                value={emptyStr(form.specialNotes)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, specialNotes: e.target.value || null }))
                }
                placeholder="検査員コメントなど"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "登録"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
