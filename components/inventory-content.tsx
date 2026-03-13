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
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  kpiCard,
  lbl,
  inp,
  btn,
  badge,
  table,
  th,
  td,
} from "@/components/ui-system"

const STATUSES = ["未処理", "出品準備中", "ヤフオク出品中", "売約済み"] as const
const CATEGORIES = ["車体", "パーツ"] as const
const SC: Record<string, string> = {
  未処理: C.yellow,
  出品準備中: C.blue,
  "ヤフオク出品中": C.orange,
  売約済み: C.green,
}
const fmt = (n: number | null) =>
  n != null ? `¥${n.toLocaleString()}` : "—"
const getDisplayName = (item: InventoryItemRow) => {
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

  const counts = STATUSES.reduce(
    (a, s) => ({ ...a, [s]: items.filter((i) => i.status === s).length }),
    {} as Record<string, number>
  )

  if (loading && items.length === 0)
    return (
      <div style={{ ...pageWrapper, color: C.textMuted }}>
        読み込み中...
      </div>
    )

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
          在庫カルテ
        </div>
        <div style={pageSub}>
          在庫 & 古物台帳の統合管理 · {items.length}件
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 14,
            background: C.redGlow,
            border: `1px solid ${C.red}40`,
            borderRadius: 8,
            color: C.red,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {STATUSES.map((s) => (
          <div
            key={s}
            style={{ ...kpiCard(SC[s]), cursor: "pointer" }}
            onClick={() => setStatusFilter(s)}
          >
            <div
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                width: 50,
                height: 50,
                background: `radial-gradient(circle, ${SC[s]}20 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <div style={{ ...lbl, color: SC[s] }}>{s}</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: SC[s],
              }}
            >
              {counts[s] ?? 0}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>台</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["すべて", ...STATUSES].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${statusFilter === st ? (SC[st] ?? C.orange) : C.border}`,
                background:
                  statusFilter === st
                    ? `${SC[st] ?? C.orange}15`
                    : "transparent",
                color:
                  statusFilter === st ? (SC[st] ?? C.orange) : C.textSub,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: font,
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
            ...btn("primary"),
            boxShadow: `0 0 16px ${C.orangeGlow}`,
          }}
        >
          + 新規登録
        </button>
      </div>

      {formOpen && !createdItem && (
        <div
          style={{
            ...card(C.orangeGlow),
            borderLeft: `3px solid ${C.orange}`,
          }}
        >
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
              {[
                {
                  label: "カテゴリ",
                  el: (
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
                  ),
                },
                {
                  label: "仕入日",
                  el: (
                    <input
                      style={inp}
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  ),
                },
                {
                  label: "メーカー",
                  el: (
                    <input
                      style={inp}
                      value={maker}
                      onChange={(e) => setMaker(e.target.value)}
                      placeholder="例: Honda"
                    />
                  ),
                },
                {
                  label: "車種",
                  el: (
                    <input
                      style={inp}
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="例: スーパーカブ"
                    />
                  ),
                },
                {
                  label: "型式",
                  el: (
                    <input
                      style={inp}
                      value={modelType}
                      onChange={(e) => setModelType(e.target.value)}
                      placeholder="例: AA09"
                    />
                  ),
                },
                {
                  label: "車台番号",
                  el: (
                    <input
                      style={inp}
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value)}
                    />
                  ),
                },
                {
                  label: "仕入価格（円）",
                  el: (
                    <input
                      style={inp}
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="0"
                    />
                  ),
                },
                {
                  label: "状態メモ",
                  el: (
                    <input
                      style={inp}
                      value={conditionMemo}
                      onChange={(e) => setConditionMemo(e.target.value)}
                      placeholder="例: 実働・外装キズあり"
                    />
                  ),
                },
              ].map(({ label, el }) => (
                <div key={label}>
                  <label style={{ ...lbl, marginBottom: 4 }}>{label}</label>
                  {el}
                </div>
              ))}
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
                    <label style={{ ...lbl, marginBottom: 4 }}>
                      {label}
                    </label>
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
                  ...btn("primary"),
                  opacity: submitting ? 0.6 : 1,
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
                style={btn("ghost")}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {createdItem && (
        <div
          style={{
            ...card(C.greenGlow),
            borderLeft: `4px solid ${C.green}`,
            marginBottom: 16,
          }}
        >
          <div style={{ ...lbl, color: C.green }}>✓ 登録完了</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 16,
              color: C.green,
            }}
          >
            {createdItem.management_code}
          </div>
          <div
            ref={qrContainerRef}
            style={{
              marginBottom: 16,
              padding: 12,
              background: "#fff",
              display: "inline-block",
              borderRadius: 6,
            }}
          >
            <QRCodeSVG value={detailUrl} size={100} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCopyUrl} style={btn("ghost")}>
              URLコピー
            </button>
            <button onClick={handleDownloadQrImage} style={btn("ghost")}>
              QR保存
            </button>
            <button
              onClick={() => {
                resetForm()
                setFormOpen(false)
              }}
              style={btn("primary")}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <div style={card()}>
        <div style={{ ...lbl, marginBottom: 16 }}>
          在庫一覧（{filtered.length}件）
        </div>
        {filtered.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: C.textMuted,
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            データなし
          </div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                {["管理番号", "車名", "仕入価格", "状態", "ステータス"].map(
                  (h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  style={{ transition: "background 0.15s" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.surfaceHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={td}>
                    <Link
                      href={`/inventory/${item.management_code}`}
                      style={{
                        color: C.orange,
                        textDecoration: "none",
                        fontWeight: "bold",
                      }}
                    >
                      {item.management_code}
                    </Link>
                  </td>
                  <td style={{ ...td, fontWeight: "bold" }}>
                    {getDisplayName(item)}
                  </td>
                  <td style={{ ...td, color: C.textSub }}>
                    {fmt(item.purchase_price)}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        fontSize: 12,
                        color: C.textMuted,
                      }}
                    >
                      {item.condition_memo?.slice(0, 12) ?? "—"}
                    </span>
                  </td>
                  <td style={td}>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(item.id, e.target.value)
                      }
                      style={{
                        background: `${SC[item.status] ?? C.border}15`,
                        border: `1px solid ${SC[item.status] ?? C.border}40`,
                        borderRadius: 4,
                        color: SC[item.status] ?? C.textSub,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: font,
                        outline: "none",
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
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
