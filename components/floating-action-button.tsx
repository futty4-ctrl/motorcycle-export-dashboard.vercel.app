"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Plus, Camera, Bike, X, Loader2, Calculator, Receipt } from "lucide-react"
import { addVehicleWithDriveFolder } from "@/app/actions/vehicles"

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleAddVehicle() {
    if (adding) return
    setAdding(true)
    setIsOpen(false)
    const result = await addVehicleWithDriveFolder()
    setAdding(false)
    if (result.success) {
      toast.success("車両を追加しました", {
        description: result.message,
      })
    } else {
      toast.error("車両の追加に失敗しました", {
        description: result.error,
      })
    }
  }

  return (
    <div className="fab-position fixed z-40 flex flex-col-reverse items-end gap-3">
      {isOpen && (
        <div className="flex flex-col-reverse items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            className="flex h-12 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-card-foreground shadow-lg transition-colors hover:bg-secondary disabled:opacity-50"
            onClick={handleAddVehicle}
            disabled={adding}
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Bike className="h-4 w-4 text-primary" />
            )}
            車両を追加
          </button>
          <Link
            href="/upload"
            className="flex h-12 min-h-[48px] items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-card-foreground shadow-lg transition-colors hover:bg-secondary touch-manipulation"
            onClick={() => setIsOpen(false)}
          >
            <Camera className="h-4 w-4 text-accent" />
            写真をアップロード
          </Link>
          <Link
            href="/quote"
            className="flex h-12 min-h-[48px] items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-card-foreground shadow-lg transition-colors hover:bg-secondary touch-manipulation"
            onClick={() => setIsOpen(false)}
          >
            <Calculator className="h-4 w-4 text-primary" />
            見積書を作る
          </Link>
          <Link
            href="/invoice"
            className="flex h-12 min-h-[48px] items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-card-foreground shadow-lg transition-colors hover:bg-secondary touch-manipulation"
            onClick={() => setIsOpen(false)}
          >
            <Receipt className="h-4 w-4 text-primary" />
            請求書を作る
          </Link>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all lg:h-12 lg:w-12 ${
          isOpen
            ? "rotate-45 bg-secondary text-secondary-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
        aria-label={isOpen ? "閉じる" : "クイック操作"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  )
}
