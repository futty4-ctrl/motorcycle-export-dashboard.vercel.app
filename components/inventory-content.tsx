"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import {
  fetchInventoryItems,
  insertInventoryItem,
  updateInventoryItemStatus,
  type InventoryItemRow,
} from "@/lib/inventory-supabase"
import { toast } from "sonner"
import type { CSSProperties } from "react"

const STATUSES = ["未処理", "出品準備中", "ヤフオク出品中", "売約済み"] as const
const CATEGORIES = ["車体", "パーツ"] as const

const C = {
  surface: "#111113",
  border: "#1e1e22",
  orange: "#f5720a",
  text: "#e8e8ec",
  textMuted: "#6b6b74",
  textSub: "#9999a8",
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#eab308",
}

const card: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
}
const lbl: CSSProperties = {
  fontSize: 11,
  color: C.textMuted,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 8,
}
const inp: CSSProperties = {
  background: "#0e0e10",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.text,
  padding: "9px 12px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
}
const SC: Record<string, string> = {
  未処理: C.yellow,
  出品準備中: C.blue,
  "ヤフオク出品中": C.orange,
  売約済み: C.green,
}

const fmt = (n: number | null) =>
  n != null ? `¥${n.toLocaleString()}` : "—"

function getDisplayName(item: InventoryItemRow) {
  const parts = [item.maker, item.model_name, item.model_type].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "（未入力）"
}

export function InventoryContent() {
  const [items, setItems] = useState<InventoryItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("すべて")
  const [submitting, setSubmitting] = useState(false)
  const [createdItem, setCreatedItem] = useState<InventoryItemRow | null>(null)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  const [category, setCategory] = useState<"車体" | "パーツ">("車体")
  const [maker, setMaker] = useState("")
  const [modelName, setModelName] = useState("")
  const [modelType, setModelType] = useState("")
  const [chassisNumber, setChassisNumber] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [conditionMemo, setConditionMemo] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [sellerName, setSellerName] = useState("")
  const [sellerAge, setSellerAge] = useState("")
  const [sellerAddress, setSellerAddress] = useState("")
  const [sellerOccupation, setSellerOccupation] = useState("")
  const [idVerificationMethod, setIdVerificationMethod] = useState("")

  const loadItems = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await fetchInventoryItems()
    if (err) {
      setError(err.message)
      setItems([])
    } else if (data) setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  function resetForm() {
    setCategory("車体")
    setMaker("")
    setModelName("")
    setModelType("")
    setChassisNumber("")
    setPurchasePrice("")
    setConditionMemo("")
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setSellerName("")
    setSellerAge("")
    setSellerAddress("")
    setSellerOccupation("")
    setIdVerificationMethod("")
    setCreatedItem(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { data, error: err } = await insertInventoryItem({
      purchase_date: purchaseDate,
      category,
      maker: maker.trim() || null,
      model_name: modelName.trim() || null,
      model_type: modelType.trim() || null,
      chassis_number: chassisNumber.trim() || null,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      condition_memo: conditionMemo.trim() || null,
      seller_name: sellerName.trim() || null,
      seller_age: sellerAge.trim() || null,
      seller_address: sellerAddress.trim() || null,
      seller_occupation: sellerOccupation.trim() || null,
      id_verification_method: idVerificationMethod.trim() || null,
    })
    setSubmitting(false)
    if (err) {
      toast.error(err.message)
      return
    }
    if (data) {
      setCreatedItem(data)
      setItems((prev) => [data, ...prev])
      toast.success(`${data.management_code} を登録しました`)
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const { error: err } = await updateInventoryItemStatus(id, newStatus)
    if (err) {
      toast.error(err.message)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    )
    toast.success("ステータスを更新しました")
  }

  async function handleCopyUrl() {
    if (!detailUrl) return
    try {
      await navigator.clipboard.writeText(detailUrl)
      toast.success("コピーしました")
    } catch {
      toast.error("コピーに失敗しました")
    }
  }

  function handleDownloadQrImage() {
    const svg = qrContainerRef.current?.querySelector("svg")
    if (!svg || !createdItem) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const url = URL.createObjectURL(
      new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    )
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 512
      const ctx = canvas.getContext("2d")!
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, 512, 512)
      ctx.drawImage(img, 0, 0, 512, 512)
      const a = document.createElement("a")
      a.href = canvas.toDataURL("image/png")
      a.download = `${createdItem.management_code}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("画像を保存しました")
    }
    img.src = url
  }

  const filtered =
    statusFilter === "すべて"
      ? items
      : items.filter((i) => i.status === statusFilter)
  const detailUrl =
    typeof window !== "undefined" && createdItem
      ? `${window.location.origin}/inventory/${createdItem.management_code}`
      : ""

  if (loading && items.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          color: C.textMuted,
          fontFamily: "monospace",
        }}
      >
        読み込み中...
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono','Courier New',monospace",
        color: C.text,
        padding: "32px 40px",
        maxWidth: 900,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginBottom: 4,
        }}
      >
        在庫カルテ
      </div>
      <div
        style={{
          fontSize: 12,
          color: C.textSub,
          marginBottom: 28,
        }}
      >
        在庫 & 古物台帳の統合管理
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: `${C.red}10`,
            border: `1px solid ${C.red}40`,
            borderRadius: 8,
            color: C.red,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* フィルター + 登録ボタン */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["すべて", ...STATUSES].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${statusFilter === st ? C.orange : C.border}`,
                background:
                  statusFilter === st ? `${C.orange}15` : "transparent",
                color: statusFilter === st ? C.orange : C.textSub,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              {st}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            resetForm()
            setFormOpen(true)
          }}
          style={{
            padding: "10px 20px",
            background: C.orange,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          + 新規登録
        </button>
      </div>

      {/* 登録フォーム */}
      {formOpen && !createdItem && (
        <div style={card}>
          <div style={lbl}>新規車両登録</div>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>カテゴリ</label>
                <select
                  style={inp}
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as "車体" | "パーツ")
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>仕入日</label>
                <input
                  style={inp}
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>メーカー</label>
                <input
                  style={inp}
                  value={maker}
                  onChange={(e) => setMaker(e.target.value)}
                  placeholder="例: Honda"
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>車種</label>
                <input
                  style={inp}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="例: スーパーカブ"
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>型式</label>
                <input
                  style={inp}
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  placeholder="例: AA09"
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>車台番号</label>
                <input
                  style={inp}
                  value={chassisNumber}
                  onChange={(e) => setChassisNumber(e.target.value)}
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>
                  仕入価格（円）
                </label>
                <input
                  style={inp}
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>状態メモ</label>
                <input
                  style={inp}
                  value={conditionMemo}
                  onChange={(e) => setConditionMemo(e.target.value)}
                  placeholder="例: エンジン実働・外装キズあり"
                />
              </div>
            </div>

            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                paddingTop: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ ...lbl, marginBottom: 12 }}>
                古物台帳（受入情報）
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {[
                  {
                    label: "売主氏名",
                    val: sellerName,
                    set: setSellerName,
                    ph: "山田 太郎",
                  },
                  {
                    label: "年齢",
                    val: sellerAge,
                    set: setSellerAge,
                    ph: "35",
                  },
                  {
                    label: "住所",
                    val: sellerAddress,
                    set: setSellerAddress,
                    ph: "大阪府守口市...",
                  },
                  {
                    label: "職業",
                    val: sellerOccupation,
                    set: setSellerOccupation,
                    ph: "会社員",
                  },
                  {
                    label: "本人確認方法",
                    val: idVerificationMethod,
                    set: setIdVerificationMethod,
                    ph: "運転免許証",
                  },
                ].map(({ label, val, set, ph }) => (
                  <div key={label}>
                    <label style={{ ...lbl, marginBottom: 4 }}>{label}</label>
                    <input
                      style={inp}
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={ph}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "10px 24px",
                  background: C.orange,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                {submitting ? "登録中..." : "登録する"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setFormOpen(false)
                }}
                style={{
                  padding: "10px 24px",
                  background: "transparent",
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 登録完了 */}
      {createdItem && (
        <div
          style={{
            ...card,
            borderLeft: `4px solid ${C.green}`,
          }}
        >
          <div style={{ ...lbl, color: C.green }}>登録完了</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            {createdItem.management_code}
          </div>
          <div ref={qrContainerRef} style={{ marginBottom: 12 }}>
            <QRCodeSVG value={detailUrl} size={120} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCopyUrl}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: C.textSub,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              URLコピー
            </button>
            <button
              onClick={handleDownloadQrImage}
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: C.textSub,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              QR保存
            </button>
            <button
              onClick={() => {
                resetForm()
                setFormOpen(false)
              }}
              style={{
                padding: "8px 16px",
                background: C.orange,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 在庫一覧 */}
      <div style={card}>
        <div style={{ ...lbl, marginBottom: 12 }}>
          在庫一覧（{filtered.length}件）
        </div>
        {filtered.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: C.textMuted,
              padding: "12px 0",
            }}
          >
            データなし
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                {["管理番号", "車名", "仕入価格", "ステータス"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 11,
                      color: C.textMuted,
                      borderBottom: `1px solid ${C.border}`,
                      letterSpacing: 1,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}50`,
                    }}
                  >
                    <Link
                      href={`/inventory/${item.management_code}`}
                      style={{
                        color: C.orange,
                        textDecoration: "none",
                      }}
                    >
                      {item.management_code}
                    </Link>
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}50`,
                    }}
                  >
                    {getDisplayName(item)}
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}50`,
                      color: C.textSub,
                    }}
                  >
                    {fmt(item.purchase_price)}
                  </td>
                  <td
                    style={{
                      padding: "11px 12px",
                      borderBottom: `1px solid ${C.border}50`,
                    }}
                  >
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(item.id, e.target.value)
                      }
                      style={{
                        ...inp,
                        width: "auto",
                        padding: "4px 8px",
                        fontSize: 12,
                        color: SC[item.status] || C.textSub,
                        background: `${SC[item.status] || C.border}15`,
                        border: `1px solid ${SC[item.status] || C.border}40`,
                      }}
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
