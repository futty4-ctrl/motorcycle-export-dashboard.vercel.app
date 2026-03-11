"use client"

import { useState } from "react"
import Link from "next/link"

type AssessmentResult = {
  bike_name: string
  chassis_number: string
  year: string
  mileage: string
  color: string
  displacement: string
  parts: string
  auction_price: number
  engine_status: string
  damage_summary: string
  total_cost_min: number
  total_cost_max: number
  sell_price_min: number
  sell_price_max: number
  profit_min: number
  profit_max: number
  verdict: "GO" | "NG" | "CAUTION"
  verdict_reason: string
  bid_limit: number
}

export function AssessContent() {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setSaved(false)
    setError(null)
  }

  const handleAssess = async () => {
    if (!image) return
    setLoading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1]
      try {
        const res = await fetch("/api/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: image.type }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setResult(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "査定に失敗しました")
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(image)
  }

  const handleSave = async () => {
    if (!result) return
    try {
      const res = await fetch("/api/assess/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      })
      if (!res.ok) throw new Error("保存失敗")
      setSaved(true)
    } catch {
      setError("Supabaseへの保存に失敗しました")
    }
  }

  const verdictColor = {
    GO: "text-emerald-400 border-emerald-400",
    NG: "text-red-400 border-red-400",
    CAUTION: "text-amber-400 border-amber-400",
  }

  const verdictBg = {
    GO: "bg-emerald-400/10",
    NG: "bg-red-400/10",
    CAUTION: "bg-amber-400/10",
  }

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LEFT: Upload */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            BDS個票スクショをアップロード
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            画像を選択して「査定する」を押すと、AIが解析します。
          </p>
        </div>

        <label className="block cursor-pointer group">
          <div
            className={`relative border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden min-h-[320px] ${
              preview ? "border-primary/40" : "border-border hover:border-primary/30"
            }`}
          >
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="w-full h-full object-contain"
                style={{ maxHeight: "480px" }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground group-hover:text-foreground/70 transition-colors">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="text-sm">BDS個票スクショをここにドロップ</span>
                <span className="text-xs text-muted-foreground">PNG / JPG</span>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </label>

        {image && (
          <button
            onClick={handleAssess}
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation"
          >
            {loading ? "査定中..." : "査定する"}
          </button>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}
      </div>

      {/* RIGHT: Result */}
      <div className="space-y-4">
        {loading && (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm min-h-[320px]">
            <div className="text-center space-y-2">
              <div className="animate-pulse text-4xl">⚙</div>
              <div>画像を解析中...</div>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            <div className={`border rounded-xl p-4 ${verdictColor[result.verdict]} ${verdictBg[result.verdict]}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-2xl font-black tracking-widest">
                  {result.verdict === "GO" ? "✓ GO" : result.verdict === "NG" ? "✗ NG" : "⚠ CAUTION"}
                </span>
                <span className="text-sm opacity-70">{result.verdict_reason}</span>
              </div>
            </div>

            <div className="border border-border rounded-xl p-4 space-y-2 bg-card">
              <div className="text-muted-foreground text-xs uppercase tracking-widest mb-3">車両情報</div>
              {[
                ["車種", result.bike_name],
                ["車台番号", result.chassis_number],
                ["走行距離", result.mileage],
                ["色", result.color],
                ["排気量", result.displacement],
                ["落札価格", `¥${result.auction_price?.toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-medium">{value || "—"}</span>
                </div>
              ))}
            </div>

            <div className="border border-border rounded-xl p-4 bg-card">
              <div className="text-muted-foreground text-xs uppercase tracking-widest mb-3">状態サマリー</div>
              <p className="text-sm text-foreground/90 leading-relaxed">{result.damage_summary}</p>
              <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">{result.engine_status}</div>
            </div>

            <div className="border border-border rounded-xl p-4 space-y-2 bg-card">
              <div className="text-muted-foreground text-xs uppercase tracking-widest mb-3">収支シミュレーション</div>
              {[
                ["総コスト（仕入＋修理）", `¥${result.total_cost_min?.toLocaleString()} 〜 ¥${result.total_cost_max?.toLocaleString()}`],
                ["想定売値", `¥${result.sell_price_min?.toLocaleString()} 〜 ¥${result.sell_price_max?.toLocaleString()}`],
                ["粗利見込み", `¥${result.profit_min?.toLocaleString()} 〜 ¥${result.profit_max?.toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground">{value}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm font-bold">
                <span className="text-muted-foreground">入札上限</span>
                <span className="text-primary text-lg">¥{result.bid_limit?.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saved}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all touch-manipulation ${
                saved
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-default"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary"
              }`}
            >
              {saved ? "✓ Supabaseに保存済み" : "Supabaseに保存する"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
