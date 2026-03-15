"use client"

import { useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabase"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  borderLight: "#333333",
  orange: "#f97316",
  green: "#22c55e",
  greenDim: "#14532d",
  red: "#ef4444",
  redDim: "#7f1d1d",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

interface LineItem {
  id: string
  desc: string
  qty: number
  unit: string
  price: number
}

const newItem = (): LineItem => ({
  id: crypto.randomUUID(),
  desc: "",
  qty: 1,
  unit: "式",
  price: 0,
})

const UNITS = ["式", "時間", "個", "件", "月", "日", "枚", "台"]

const fmt = (n: number) =>
  n.toLocaleString("ja-JP", { style: "currency", currency: "JPY" })

const inputStyle = (width = "100%"): CSSProperties => ({
  width,
  background: C.surfaceHigh,
  border: `1px solid ${C.border}`,
  borderRadius: 5,
  padding: "8px 12px",
  color: C.text,
  fontFamily: C.fontSans,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
})

const labelStyle: CSSProperties = {
  display: "block",
  fontFamily: C.font,
  fontSize: 10,
  color: C.textMuted,
  marginBottom: 5,
  letterSpacing: "0.08em",
}

export default function InvoiceEditor({
  initial,
  onSaved,
}: {
  initial?: {
    id?: string
    invoice_type?: "invoice" | "quote"
    issue_date?: string
    client_name?: string
    subject?: string
    bank_info?: string
    tax_rate?: number
    notes?: string
    items?: LineItem[]
  }
  onSaved?: () => void
}) {
  const [invoiceType, setInvoiceType] = useState<"invoice" | "quote">(
    initial?.invoice_type ?? "invoice"
  )
  const [issueDate, setIssueDate] = useState(
    initial?.issue_date ?? new Date().toISOString().slice(0, 10)
  )
  const [clientName, setClientName] = useState(initial?.client_name ?? "")
  const [subject, setSubject] = useState(initial?.subject ?? "")
  const [bankInfo, setBankInfo] = useState(
    initial?.bank_info ??
      "福岡銀行 藤崎支店（店番252）\n普通 1510241 フチガミ フミヤ"
  )
  const [taxRate, setTaxRate] = useState<number>(initial?.tax_rate ?? 0)
  const [notes, setNotes] = useState(
    initial?.notes ?? "上記のとおり、領収申し上げます。"
  )

  const [items, setItems] = useState<LineItem[]>(
    initial?.items?.length ? initial.items : [newItem()]
  )

  const updateItem = (id: string, key: keyof LineItem, value: string | number) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [key]: value } : it))
    )

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.id !== id))

  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0)
  const tax = Math.floor((subtotal * taxRate) / 100)
  const total = subtotal + tax

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!clientName || !subject) return
    setSaving(true)
    try {
      const payload = {
        invoice_type: invoiceType,
        issue_date: issueDate,
        client_name: clientName,
        subject,
        tax_rate: taxRate,
        notes,
        bank_info: bankInfo,
        items,
        updated_at: new Date().toISOString(),
      }
      if (initial?.id) {
        const { error } = await supabase
          .from("invoices")
          .update(payload)
          .eq("id", initial.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("invoices").insert(payload)
        if (error) throw error
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => window.print()

  const titleLabel =
    invoiceType === "invoice" ? "御　請　求　書" : "御　見　積　書"
  const today = new Date(issueDate).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 480px",
        gap: 24,
        alignItems: "start",
      }}
    >
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(
            [
              ["invoice", "請求書"],
              ["quote", "見積書"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setInvoiceType(v)}
              style={{
                padding: "8px 20px",
                background: invoiceType === v ? C.orange : C.surfaceHigh,
                border: `1px solid ${invoiceType === v ? C.orange : C.border}`,
                borderRadius: 6,
                color: invoiceType === v ? "#fff" : C.textSub,
                fontFamily: C.fontSans,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: C.fontSans,
              fontWeight: 700,
              fontSize: 14,
              color: C.text,
              marginBottom: 16,
            }}
          >
            基本情報
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={labelStyle}>宛先（会社名）</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="株式会社〇〇"
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={labelStyle}>請求日</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                style={inputStyle()}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>件名</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="作業代金"
              style={inputStyle()}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>振込先</label>
            <textarea
              value={bankInfo}
              onChange={(e) => setBankInfo(e.target.value)}
              rows={2}
              style={{ ...inputStyle(), resize: "none" }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <div>
              <label style={labelStyle}>消費税率 (%)</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                style={inputStyle()}
              >
                <option value={0}>0%（非課税）</option>
                <option value={8}>8%</option>
                <option value={10}>10%</option>
              </select>
            </div>
          </div>
        </div>

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: C.fontSans,
              fontWeight: 700,
              fontSize: 14,
              color: C.text,
              marginBottom: 16,
            }}
          >
            明細
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px 110px 110px 36px",
              gap: 8,
              marginBottom: 8,
            }}
          >
            {["摘要", "数量", "単位", "単価", "金額", ""].map((h) => (
              <div
                key={h}
                style={{
                  fontFamily: C.font,
                  fontSize: 10,
                  color: C.textMuted,
                  letterSpacing: "0.08em",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px 110px 110px 36px",
                gap: 8,
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              <input
                value={item.desc}
                onChange={(e) => updateItem(item.id, "desc", e.target.value)}
                placeholder="作業費（〇〇 〇日）"
                style={inputStyle()}
              />
              <input
                type="number"
                value={item.qty}
                onChange={(e) =>
                  updateItem(item.id, "qty", Number(e.target.value))
                }
                style={inputStyle()}
              />
              <select
                value={item.unit}
                onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                style={inputStyle()}
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <input
                type="number"
                value={item.price}
                onChange={(e) =>
                  updateItem(item.id, "price", Number(e.target.value))
                }
                style={inputStyle()}
              />
              <div
                style={{
                  fontFamily: C.fontSans,
                  fontWeight: 600,
                  fontSize: 13,
                  color: C.orange,
                  textAlign: "right",
                }}
              >
                {fmt(item.qty * item.price)}
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
                style={{
                  background: "none",
                  border: `1px solid ${C.redDim}`,
                  borderRadius: 4,
                  color: C.red,
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "4px",
                  opacity: items.length === 1 ? 0.3 : 1,
                }}
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, newItem()])}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              background: "none",
              border: `1px dashed ${C.border}`,
              borderRadius: 6,
              color: C.textSub,
              fontFamily: C.fontSans,
              fontSize: 12,
              cursor: "pointer",
              width: "100%",
            }}
          >
            ＋ 行を追加
          </button>

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {[
              ["小計", fmt(subtotal)],
              [`消費税 (${taxRate}%)`, fmt(tax)],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontFamily: C.fontSans,
                  fontSize: 13,
                  color: C.textSub,
                }}
              >
                <span>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0 0",
                borderTop: `1px solid ${C.border}`,
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 18,
                color: C.orange,
              }}
            >
              <span>合計（税込）</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "20px 24px",
            marginBottom: 20,
          }}
        >
          <label style={{ ...labelStyle, marginBottom: 8 }}>備考</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle(), resize: "none" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: "10px 22px",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              color: C.textSub,
              fontFamily: C.fontSans,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            印刷 / PDF
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !clientName || !subject}
            style={{
              padding: "10px 28px",
              background: saved ? C.greenDim : C.orange,
              border: `1px solid ${saved ? C.green : C.orange}`,
              borderRadius: 7,
              color: saved ? C.green : "#fff",
              fontFamily: C.fontSans,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              opacity: !clientName || !subject ? 0.5 : 1,
            }}
          >
            {saving ? "保存中..." : saved ? "✓ 保存済み" : "保存"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          color: "#111",
          borderRadius: 10,
          padding: "40px 36px",
          fontFamily: "'Noto Serif JP', 'Yu Mincho', serif",
          fontSize: 13,
          lineHeight: 1.7,
          boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
          position: "sticky",
          top: 20,
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.3em",
            marginBottom: 28,
          }}
        >
          {titleLabel}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {clientName || "株式会社〇〇"} 御中
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700 }}>淵上 郁也</div>
            <div>〒570-0006</div>
            <div>大阪府守口市八雲西町2-1-27</div>
            <div>TEL：090-6423-4268</div>
          </div>
        </div>

        <div style={{ textAlign: "right", fontSize: 12, marginBottom: 16 }}>
          {invoiceType === "invoice" ? "請求日" : "見積日"}：{today}
        </div>

        {invoiceType === "invoice" && bankInfo && (
          <div
            style={{
              background: "#f8f8f8",
              border: "1px solid #ddd",
              borderRadius: 4,
              padding: "10px 14px",
              fontSize: 12,
              marginBottom: 20,
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>振込先</div>
            {bankInfo.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 16, fontWeight: 700 }}>
          件名：{subject || "〇〇"}
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          <thead>
            <tr style={{ background: "#222", color: "#fff" }}>
              {["摘要", "数量", "単位", "単価", "金額"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 8px",
                    textAlign: h === "摘要" ? "left" : "right",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={item.id}
                style={{
                  background: i % 2 === 0 ? "#fff" : "#f9f9f9",
                }}
              >
                <td
                  style={{
                    padding: "6px 8px",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {item.desc || "─"}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {item.qty.toLocaleString()}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {item.unit}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  ¥{item.price.toLocaleString()}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    textAlign: "right",
                    borderBottom: "1px solid #eee",
                    fontWeight: 600,
                  }}
                >
                  ¥{(item.qty * item.price).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: "right", fontSize: 12 }}>
          {[
            ["小計", fmt(subtotal)],
            [`消費税 (${taxRate}%)`, fmt(tax)],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "3px 0" }}>
              {k}：{v}
            </div>
          ))}
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              marginTop: 6,
              paddingTop: 6,
              borderTop: "2px solid #222",
            }}
          >
            合計（税込）：{fmt(total)}
          </div>
        </div>

        {notes && (
          <div
            style={{
              marginTop: 20,
              fontSize: 12,
              color: "#555",
              borderTop: "1px solid #ddd",
              paddingTop: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>備考</div>
            {notes.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
