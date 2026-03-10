"use client"

import { useState, useEffect, useCallback } from "react"
import { Save, Target } from "lucide-react"

const MANUFACTURERS = ["Honda", "Yamaha", "Suzuki", "Kawasaki", "その他"] as const
const CONDITIONS = ["実働", "不動", "部品取り"] as const
const LISTING_FEE_JPY = 10_000

const STORAGE_KEY = "bds-simulator-history"

export type BdsSimulatorRecord = {
  id: string
  createdAt: string
  manufacturer: string
  vehicleName: string
  modelType: string
  condition: string
  yahooAvgBid: number
  repairCost: number
  desiredProfit: number
  yahooFee: number
  bdsBidLimit: number
}

function formatJPY(n: number): string {
  return `¥${n.toLocaleString()}`
}

export function BdsSimulatorContent() {
  const [manufacturer, setManufacturer] = useState<string>("Honda")
  const [vehicleName, setVehicleName] = useState("")
  const [modelType, setModelType] = useState("")
  const [condition, setCondition] = useState<string>("実働")
  const [yahooAvgBid, setYahooAvgBid] = useState<string>("")
  const [repairCost, setRepairCost] = useState<string>("")
  const [desiredProfit, setDesiredProfit] = useState<string>("")
  const [history, setHistory] = useState<BdsSimulatorRecord[]>([])

  const yahooAvgBidNum = Number(yahooAvgBid) || 0
  const repairCostNum = Number(repairCost) || 0
  const desiredProfitNum = Number(desiredProfit) || 0

  const yahooFee = Math.round(yahooAvgBidNum * 0.1)
  const totalCost = yahooFee + LISTING_FEE_JPY + repairCostNum + desiredProfitNum
  const bdsBidLimit = Math.max(0, yahooAvgBidNum - totalCost)

  const loadHistory = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as BdsSimulatorRecord[]
        setHistory(Array.isArray(parsed) ? parsed : [])
      }
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  function handleSave() {
    const record: BdsSimulatorRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      manufacturer,
      vehicleName,
      modelType,
      condition,
      yahooAvgBid: yahooAvgBidNum,
      repairCost: repairCostNum,
      desiredProfit: desiredProfitNum,
      yahooFee,
      bdsBidLimit,
    }
    const next = [record, ...history]
    setHistory(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ストレージが満杯の場合は無視
    }
  }

  const saveDisabled = !yahooAvgBidNum || yahooAvgBidNum <= 0

  return (
    <div className="space-y-6 pb-8">
      {/* 入力フォーム */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">メーカー</label>
          <select
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
          >
            {MANUFACTURERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">車名</label>
          <input
            type="text"
            placeholder="例: モンキー"
            value={vehicleName}
            onChange={(e) => setVehicleName(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">型式</label>
          <input
            type="text"
            placeholder="例: Z50J"
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">状態</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">ヤフオク平均落札額（円）</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            value={yahooAvgBid}
            onChange={(e) => setYahooAvgBid(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">想定整備・パーツ代（円）</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            value={repairCost}
            onChange={(e) => setRepairCost(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground">希望利益（円）</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="0"
            value={desiredProfit}
            onChange={(e) => setDesiredProfit(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-lg border border-input bg-background px-4 py-2.5 text-base touch-manipulation"
          />
        </div>
      </div>

      {/* 計算結果 */}
      <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-5">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>ヤフオクシステム手数料（10%）: {formatJPY(yahooFee)}</p>
          <p>出品経費（送料・雑費など）: {formatJPY(LISTING_FEE_JPY)}</p>
          <p>想定整備・パーツ代: {formatJPY(repairCostNum)}</p>
          <p>希望利益: {formatJPY(desiredProfitNum)}</p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center rounded-lg bg-destructive/10 p-6">
          <p className="text-sm font-medium text-muted-foreground">BDS入札上限額</p>
          <p className="mt-1 text-3xl font-bold text-destructive sm:text-4xl">
            {formatJPY(bdsBidLimit)}
          </p>
        </div>
      </div>

      {/* 保存ボタン */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saveDisabled}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="h-5 w-5" />
        保存する
      </button>

      {/* 履歴 */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Target className="h-5 w-5" />
          過去のシミュレーション履歴
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            まだ保存された履歴がありません。「保存する」ボタンで履歴に追加できます。
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-foreground">日時</th>
                  <th className="px-3 py-2.5 text-left font-medium text-foreground">車種</th>
                  <th className="px-3 py-2.5 text-right font-medium text-foreground">入札上限</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{r.manufacturer}</span>
                      {r.vehicleName && ` ${r.vehicleName}`}
                      {r.modelType && ` (${r.modelType})`}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-destructive">
                      {formatJPY(r.bdsBidLimit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
