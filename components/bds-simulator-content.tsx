"use client"

import { useState, useEffect, useCallback } from "react"
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  lbl,
  inp,
  btn,
} from "@/components/ui-system"

const MANUFACTURERS = ["Honda", "Yamaha", "Suzuki", "Kawasaki", "その他"] as const
const CONDITIONS = ["実働", "不動", "部品取り"] as const
const LISTING_FEE_JPY = 10_000
const STORAGE_KEY = "bds-simulator-history"

type BdsSimulatorRecord = {
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

const fmt = (n: number) => `¥${n.toLocaleString()}`

export function BdsSimulatorContent() {
  const [manufacturer, setManufacturer] = useState("Honda")
  const [vehicleName, setVehicleName] = useState("")
  const [modelType, setModelType] = useState("")
  const [condition, setCondition] = useState("実働")
  const [yahooAvgBid, setYahooAvgBid] = useState("")
  const [repairCost, setRepairCost] = useState("")
  const [desiredProfit, setDesiredProfit] = useState("")
  const [history, setHistory] = useState<BdsSimulatorRecord[]>([])

  const yahooAvgBidNum = Number(yahooAvgBid) || 0
  const repairCostNum = Number(repairCost) || 0
  const desiredProfitNum = Number(desiredProfit) || 0
  const yahooFee = Math.round(yahooAvgBidNum * 0.1)
  const totalCost =
    yahooFee + LISTING_FEE_JPY + repairCostNum + desiredProfitNum
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
      /* 無視 */
    }
  }

  const saveDisabled = !yahooAvgBidNum || yahooAvgBidNum <= 0
  const conditionColor = {
    実働: C.green,
    不動: C.red,
    部品取り: C.yellow,
  }

  return (
    <div style={pageWrapper}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            ...pageTitle,
            background: `linear-gradient(135deg, ${C.text} 60%, ${C.orange})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          BDS入札シミュ
        </div>
        <div style={pageSub}>
          ヤフオク相場・整備代・希望利益 → 入札上限額を計算
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <div style={card()}>
          <div style={lbl}>車両情報</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>メーカー</label>
              <select
                style={inp}
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              >
                {MANUFACTURERS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>状態</label>
              <select
                style={{
                  ...inp,
                  color:
                    conditionColor[condition as keyof typeof conditionColor] ??
                    C.text,
                }}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>車名</label>
              <input
                style={inp}
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="例: モンキー"
              />
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>型式</label>
              <input
                style={inp}
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                placeholder="例: Z50J"
              />
            </div>
          </div>

          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 16,
            }}
          >
            <div style={lbl}>価格設定</div>
            {[
              {
                label: "ヤフオク平均落札額（円）",
                val: yahooAvgBid,
                set: setYahooAvgBid,
                ph: "例: 200000",
              },
              {
                label: "想定整備・パーツ代（円）",
                val: repairCost,
                set: setRepairCost,
                ph: "例: 30000",
              },
              {
                label: "希望利益（円）",
                val: desiredProfit,
                set: setDesiredProfit,
                ph: "例: 50000",
              },
            ].map(({ label, val, set, ph }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ ...lbl, marginBottom: 4 }}>{label}</label>
                <input
                  style={inp}
                  type="number"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={ph}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={card()}>
            <div style={lbl}>計算内訳</div>
            {[
              {
                label: "ヤフオクシステム手数料（10%）",
                value: yahooFee,
                color: C.red,
              },
              {
                label: "出品経費（送料・雑費）",
                value: LISTING_FEE_JPY,
                color: C.yellow,
              },
              {
                label: "想定整備・パーツ代",
                value: repairCostNum,
                color: C.blue,
              },
              {
                label: "希望利益",
                value: desiredProfitNum,
                color: C.green,
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: `1px solid ${C.border}40`,
                  fontSize: 13,
                }}
              >
                <span style={{ color: C.textMuted }}>{label}</span>
                <span style={{ color, fontWeight: "bold" }}>
                  {fmt(value)}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              ...card(
                bdsBidLimit > 0 ? C.orangeGlow : C.redGlow
              ),
              borderLeft: `4px solid ${bdsBidLimit > 0 ? C.orange : C.red}`,
              textAlign: "center",
              background: `linear-gradient(135deg, ${C.surface} 60%, ${bdsBidLimit > 0 ? C.orangeGlow : C.redGlow})`,
            }}
          >
            <div style={lbl}>BDS 入札上限額</div>
            <div
              style={{
                fontSize: 48,
                fontWeight: "bold",
                color: bdsBidLimit > 0 ? C.orange : C.red,
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              {fmt(bdsBidLimit)}
            </div>
            {bdsBidLimit <= 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: C.red,
                  marginTop: 8,
                }}
              >
                ⚠ 条件を見直してください
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saveDisabled}
            style={{
              ...btn("primary"),
              width: "100%",
              padding: "12px 0",
              opacity: saveDisabled ? 0.4 : 1,
              boxShadow: saveDisabled
                ? "none"
                : `0 0 16px ${C.orangeGlow}`,
            }}
          >
            保存する
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ ...card(), marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={lbl}>保存履歴</div>
            <button
              onClick={() => {
                setHistory([])
                localStorage.removeItem(STORAGE_KEY)
              }}
              style={{
                fontSize: 11,
                color: C.red,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              クリア
            </button>
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                {["日時", "車両", "状態", "ヤフオク相場", "入札上限"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        fontSize: 10,
                        color: C.textMuted,
                        borderBottom: `1px solid ${C.border}`,
                        letterSpacing: 1.5,
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr
                  key={r.id}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.surfaceHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  style={{ transition: "background 0.15s" }}
                >
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${C.border}40`,
                      fontSize: 11,
                      color: C.textMuted,
                    }}
                  >
                    {new Date(r.createdAt).toLocaleString("ja-JP")}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${C.border}40`,
                    }}
                  >
                    {r.manufacturer} {r.vehicleName}{" "}
                    {r.modelType && `(${r.modelType})`}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${C.border}40`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          conditionColor[
                            r.condition as keyof typeof conditionColor
                          ] ?? C.textSub,
                      }}
                    >
                      {r.condition}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${C.border}40`,
                      color: C.textSub,
                    }}
                  >
                    {fmt(r.yahooAvgBid)}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${C.border}40`,
                      color: C.orange,
                      fontWeight: "bold",
                    }}
                  >
                    {fmt(r.bdsBidLimit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
