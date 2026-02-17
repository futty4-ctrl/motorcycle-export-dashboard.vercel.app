"use client"

import { useState, useEffect } from "react"
import { getSettings, updateSettings, type AppSettings } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function SettingsForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AppSettings>({
    domesticShippingJpy: 30000,
    yahooFeesJpy: 10000,
    yahooShippingJpy: 5000,
    ebayFeesUsd: 50,
    ebayShippingUsd: 40,
    fallbackUsdJpy: 150,
  })

  useEffect(() => {
    getSettings().then((s) => {
      setForm(s)
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await updateSettings(form)
    setSaving(false)
    if (res.success) {
      toast.success("設定を保存しました。利益シミュのデフォルト値に反映されます。")
    } else {
      toast.error(res.error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">利益計算のデフォルト値</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          車両詳細の利益シミュレーターで未入力時に使う値です。査定実行時にも未指定ならここで設定した値が使われます。
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="domesticShippingJpy" className="text-sm">
              陸送費（円）
            </Label>
            <Input
              id="domesticShippingJpy"
              type="number"
              min={0}
              value={form.domesticShippingJpy}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, domesticShippingJpy: Number(e.target.value) || 0 }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="yahooFeesJpy" className="text-sm">
              ヤフオク手数料（円）
            </Label>
            <Input
              id="yahooFeesJpy"
              type="number"
              min={0}
              value={form.yahooFeesJpy}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, yahooFeesJpy: Number(e.target.value) || 0 }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="yahooShippingJpy" className="text-sm">
              ヤフオク送料（円）
            </Label>
            <Input
              id="yahooShippingJpy"
              type="number"
              min={0}
              value={form.yahooShippingJpy}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, yahooShippingJpy: Number(e.target.value) || 0 }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ebayFeesUsd" className="text-sm">
              eBay 手数料（USD）
            </Label>
            <Input
              id="ebayFeesUsd"
              type="number"
              min={0}
              step={0.01}
              value={form.ebayFeesUsd}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, ebayFeesUsd: Number(e.target.value) || 0 }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ebayShippingUsd" className="text-sm">
              eBay 送料（USD）
            </Label>
            <Input
              id="ebayShippingUsd"
              type="number"
              min={0}
              step={0.01}
              value={form.ebayShippingUsd}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, ebayShippingUsd: Number(e.target.value) || 0 }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fallbackUsdJpy" className="text-sm">
              為替フォールバック（円）
            </Label>
            <Input
              id="fallbackUsdJpy"
              type="number"
              min={1}
              value={form.fallbackUsdJpy}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fallbackUsdJpy: Number(e.target.value) || 150 }))
              }
              className="mt-1"
            />
            <p className="mt-0.5 text-xs text-muted-foreground">
              為替API取得失敗時に使う USD/JPY レート。環境変数 FALLBACK_USD_JPY が優先されます。
            </p>
          </div>
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            保存中…
          </>
        ) : (
          "設定を保存"
        )}
      </Button>
    </form>
  )
}
