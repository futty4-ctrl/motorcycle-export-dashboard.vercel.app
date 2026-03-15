"use client"

import { useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "@/lib/supabase"

const C = {
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
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

const fmtYen = (n: number) => `¥${n.toLocaleString()}`

const inputStyle = (): CSSProperties => ({
  width: "100%",
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

const MY_INFO = {
  name: "淵上 郁也",
  zip: "〒570-0006",
  address: "大阪府守口市八雲西町2-1-27",
  tel: "090-6423-4268",
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

  const updateItem = (id: string, key: keyof LineItem, val: string | number) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [key]: val } : it))
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

  const titleLabel =
    invoiceType === "invoice" ? "御　請　求　書" : "御　見　積　書"
  const dateLabel = invoiceType === "invoice" ? "請求日" : "見積日"
  const today = new Date(issueDate).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700")
    if (!printWindow) return

    const todayStr = new Date(issueDate).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const titleLabelStr =
      invoiceType === "invoice" ? "御　請　求　書" : "御　見　積　書"
    const dateLabelStr = invoiceType === "invoice" ? "請求日" : "見積日"

    printWindow.document.write(`
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <title>${titleLabelStr}</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 portrait; margin: 8mm 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
      body {
        margin: 0; padding: 0;
        background: #fff; color: #111;
        font-family: 'Noto Serif JP', 'Yu Mincho', serif;
        font-size: 8pt;
        line-height: 1.45;
      }
    </style>
  </head>
  <body>

    <!-- タイトル -->
    <div style="text-align:center;font-size:13pt;font-weight:700;letter-spacing:0.35em;margin-bottom:3mm;padding-bottom:2mm;border-bottom:2px solid #111">
      ${titleLabelStr}
    </div>

    <!-- 宛先 + 自社 -->
    <div style="display:flex;justify-content:space-between;margin-bottom:3mm">
      <div style="flex:1">
        <div style="font-size:10pt;font-weight:700;border-bottom:1px solid #111;padding-bottom:1mm;margin-bottom:1mm">
          ${clientName || "　"} 御中
        </div>
        <div style="font-size:7.5pt;color:#555">
          下記のとおりご${invoiceType === "invoice" ? "請求" : "見積"}申し上げます。
        </div>
      </div>
      <div style="text-align:right;font-size:7.5pt;line-height:1.6;min-width:48mm;margin-left:6mm">
        <div style="font-weight:700;font-size:9pt">淵上 郁也</div>
        <div>〒570-0006</div>
        <div>大阪府守口市八雲西町2-1-27</div>
        <div>TEL：090-6423-4268</div>
        <div style="margin-top:0.5mm">${dateLabelStr}：${todayStr}</div>
      </div>
    </div>

    <!-- 件名 -->
    <div style="background:#f0f0f0;padding:1.5mm 3mm;margin-bottom:2.5mm;font-weight:700;font-size:9pt;border-left:4px solid #111">
      件名：${subject || "　"}
    </div>

    <!-- 合計金額ボックス（請求書のみ） -->
    ${invoiceType === "invoice" ? `
      <div style="border:2px solid #111;padding:2mm 4mm;margin-bottom:2.5mm;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:9pt">合計金額（税込）</span>
        <span style="font-weight:700;font-size:12pt">¥${total.toLocaleString()} ─</span>
      </div>
    ` : ""}

    <!-- 振込先（請求書のみ） -->
    ${invoiceType === "invoice" && bankInfo ? `
      <div style="background:#f8f8f8;border:1px solid #ccc;padding:1.5mm 3mm;margin-bottom:2.5mm;font-size:7.5pt">
        <div style="font-weight:700;margin-bottom:0.5mm">■ お振込先</div>
        ${bankInfo.split("\n").map((l) => `<div>${l}</div>`).join("")}
      </div>
    ` : ""}

    <!-- 明細テーブル -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:2mm;font-size:8pt">
      <thead>
        <tr>
          <th style="background:#222;color:#fff;padding:1.5mm 2mm;text-align:left;font-weight:700">摘要</th>
          <th style="background:#222;color:#fff;padding:1.5mm 2mm;text-align:right;width:12mm">数量</th>
          <th style="background:#222;color:#fff;padding:1.5mm 2mm;text-align:center;width:10mm">単位</th>
          <th style="background:#222;color:#fff;padding:1.5mm 2mm;text-align:right;width:22mm">単価</th>
          <th style="background:#222;color:#fff;padding:1.5mm 2mm;text-align:right;width:24mm">金額</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
          <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"}">
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0">${item.desc || "　"}</td>
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0;text-align:right">${item.qty.toLocaleString()}</td>
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0;text-align:center">${item.unit}</td>
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0;text-align:right">¥${item.price.toLocaleString()}</td>
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:600">¥${(item.qty * item.price).toLocaleString()}</td>
          </tr>
        `).join("")}
        ${Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => `
          <tr style="background:${(items.length + i) % 2 === 0 ? "#fff" : "#f9f9f9"}">
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0">　</td>
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0"></td>
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0"></td>
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0"></td>
            <td style="padding:1.5mm 2mm;border-bottom:1px solid #e0e0e0"></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- 小計・税・合計 -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:2.5mm">
      <table style="font-size:8pt;border-collapse:collapse;min-width:68mm">
        <tr>
          <td style="padding:1mm 3mm;border-bottom:1px solid #ddd;color:#555">小計</td>
          <td style="padding:1mm 3mm;border-bottom:1px solid #ddd;text-align:right">¥${subtotal.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding:1mm 3mm;border-bottom:1px solid #ddd;color:#555">消費税（${taxRate}%）</td>
          <td style="padding:1mm 3mm;border-bottom:1px solid #ddd;text-align:right">¥${tax.toLocaleString()}</td>
        </tr>
        <tr style="background:#f0f0f0">
          <td style="padding:2mm 3mm;font-weight:700;border-top:2px solid #111">合計（税込）</td>
          <td style="padding:2mm 3mm;text-align:right;font-weight:700;font-size:10pt;border-top:2px solid #111">¥${total.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <!-- 備考 -->
    ${notes ? `
      <div style="border-top:1px solid #ccc;padding-top:2mm;font-size:7.5pt;color:#444">
        <div style="font-weight:700;margin-bottom:1mm">備考</div>
        ${notes.split("\n").map((l) => `<div>${l}</div>`).join("")}
      </div>
    ` : ""}

    <script>
      window.onload = function() {
        window.print()
        window.onafterprint = function() { window.close() }
      }
    <\/script>
  </body>
  </html>
`)
    printWindow.document.close()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap');

        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          body > * { display: none !important; }
          #invoice-print-area { display: block !important; }

          #invoice-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }

        @media screen {
          #invoice-print-area { display: none; }
        }
      `}</style>

      <div id="invoice-print-area">
        <PrintPreview
          titleLabel={titleLabel}
          dateLabel={dateLabel}
          today={today}
          clientName={clientName}
          subject={subject}
          bankInfo={bankInfo}
          invoiceType={invoiceType}
          items={items}
          subtotal={subtotal}
          tax={tax}
          taxRate={taxRate}
          total={total}
          notes={notes}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 440px",
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
              marginBottom: 14,
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
                <label style={labelStyle}>{dateLabel}</label>
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
            {invoiceType === "invoice" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>振込先</label>
                <textarea
                  value={bankInfo}
                  onChange={(e) => setBankInfo(e.target.value)}
                  rows={2}
                  style={{ ...inputStyle(), resize: "none" }}
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>消費税率</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                style={{ ...inputStyle(), width: 160 }}
              >
                <option value={0}>0%（非課税）</option>
                <option value={8}>8%</option>
                <option value={10}>10%</option>
              </select>
            </div>
          </div>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "20px 24px",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontFamily: C.fontSans,
                fontWeight: 700,
                fontSize: 14,
                color: C.text,
                marginBottom: 14,
              }}
            >
              明細
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 70px 72px 100px 100px 32px",
                gap: 6,
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
                  gridTemplateColumns: "1fr 70px 72px 100px 100px 32px",
                  gap: 6,
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                <input
                  value={item.desc}
                  onChange={(e) => updateItem(item.id, "desc", e.target.value)}
                  placeholder="作業内容"
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
                    fontSize: 12,
                    color: C.orange,
                    textAlign: "right",
                  }}
                >
                  {fmtYen(item.qty * item.price)}
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
                    fontSize: 13,
                    padding: "3px 6px",
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
                padding: "8px",
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
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              {[
                ["小計", fmtYen(subtotal)],
                [`消費税 (${taxRate}%)`, fmtYen(tax)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "5px 0",
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
                  fontSize: 17,
                  color: C.orange,
                }}
              >
                <span>合計（税込）</span>
                <span>{fmtYen(total)}</span>
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
              🖨 印刷 / PDF保存
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

        <div style={{ position: "sticky", top: 20 }}>
          <div
            style={{
              fontFamily: C.font,
              fontSize: 10,
              color: C.textMuted,
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            PREVIEW — 印刷イメージ
          </div>
          <div style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)", borderRadius: 4 }}>
            <PrintPreview
              titleLabel={titleLabel}
              dateLabel={dateLabel}
              today={today}
              clientName={clientName}
              subject={subject}
              bankInfo={bankInfo}
              invoiceType={invoiceType}
              items={items}
              subtotal={subtotal}
              tax={tax}
              taxRate={taxRate}
              total={total}
              notes={notes}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function PrintPreview({
  titleLabel,
  dateLabel,
  today,
  clientName,
  subject,
  bankInfo,
  invoiceType,
  items,
  subtotal,
  tax,
  taxRate,
  total,
  notes,
}: {
  titleLabel: string
  dateLabel: string
  today: string
  clientName: string
  subject: string
  bankInfo: string
  invoiceType: string
  items: LineItem[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  notes: string
}) {
  return (
    <div
      style={{
        background: "#fff",
        color: "#111",
        width: "210mm",
        minHeight: "297mm",
        padding: "20mm 18mm",
        boxSizing: "border-box",
        fontFamily:
          "'Noto Serif JP', 'Yu Mincho', 'Hiragino Mincho ProN', serif",
        fontSize: "10.5pt",
        lineHeight: 1.8,
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: "18pt",
          fontWeight: 700,
          letterSpacing: "0.4em",
          marginBottom: "12mm",
          paddingBottom: "4mm",
          borderBottom: "2px solid #111",
        }}
      >
        {titleLabel}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8mm",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "13pt",
              fontWeight: 700,
              borderBottom: "1px solid #111",
              paddingBottom: "2mm",
              marginBottom: "3mm",
            }}
          >
            {clientName || "　"} 御中
          </div>
          <div style={{ fontSize: "9pt", color: "#555" }}>
            下記のとおりご
            {invoiceType === "invoice" ? "請求" : "見積"}申し上げます。
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
            fontSize: "9pt",
            lineHeight: 2,
            minWidth: "55mm",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "11pt" }}>{MY_INFO.name}</div>
          <div>{MY_INFO.zip}</div>
          <div>{MY_INFO.address}</div>
          <div>TEL：{MY_INFO.tel}</div>
          <div style={{ marginTop: "2mm" }}>
            {dateLabel}：{today}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#f0f0f0",
          padding: "3mm 5mm",
          marginBottom: "6mm",
          fontWeight: 700,
          fontSize: "11pt",
          borderLeft: "4px solid #111",
        }}
      >
        件名：{subject || "　"}
      </div>

      {invoiceType === "invoice" && (
        <div
          style={{
            border: "2px solid #111",
            padding: "4mm 6mm",
            marginBottom: "6mm",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "11pt" }}>
            合計金額（税込）
          </span>
          <span
            style={{
              fontWeight: 700,
              fontSize: "16pt",
              letterSpacing: "0.05em",
            }}
          >
            {`¥${total.toLocaleString()}`} ─
          </span>
        </div>
      )}

      {invoiceType === "invoice" && bankInfo && (
        <div
          style={{
            background: "#f8f8f8",
            border: "1px solid #ccc",
            padding: "3mm 5mm",
            marginBottom: "6mm",
            fontSize: "9pt",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "1mm" }}>
            ■ お振込先
          </div>
          {bankInfo.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "4mm",
          fontSize: "9.5pt",
        }}
      >
        <thead>
          <tr>
            {[
              { label: "摘要", align: "left" as const, w: "auto" },
              { label: "数量", align: "right" as const, w: "16mm" },
              { label: "単位", align: "center" as const, w: "14mm" },
              { label: "単価", align: "right" as const, w: "26mm" },
              { label: "金額", align: "right" as const, w: "28mm" },
            ].map((h) => (
              <th
                key={h.label}
                style={{
                  background: "#222",
                  color: "#fff",
                  padding: "3mm 3mm",
                  textAlign: h.align,
                  width: h.w,
                  fontWeight: 700,
                  borderBottom: "2px solid #111",
                }}
              >
                {h.label}
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
                  padding: "2.5mm 3mm",
                  borderBottom: "1px solid #ddd",
                }}
              >
                {item.desc || "　"}
              </td>
              <td
                style={{
                  padding: "2.5mm 3mm",
                  textAlign: "right",
                  borderBottom: "1px solid #ddd",
                }}
              >
                {item.qty.toLocaleString()}
              </td>
              <td
                style={{
                  padding: "2.5mm 3mm",
                  textAlign: "center",
                  borderBottom: "1px solid #ddd",
                }}
              >
                {item.unit}
              </td>
              <td
                style={{
                  padding: "2.5mm 3mm",
                  textAlign: "right",
                  borderBottom: "1px solid #ddd",
                }}
              >
                ¥{item.price.toLocaleString()}
              </td>
              <td
                style={{
                  padding: "2.5mm 3mm",
                  textAlign: "right",
                  borderBottom: "1px solid #ddd",
                  fontWeight: 600,
                }}
              >
                ¥{(item.qty * item.price).toLocaleString()}
              </td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
            <tr
              key={`empty-${i}`}
              style={{
                background:
                  (items.length + i) % 2 === 0 ? "#fff" : "#f9f9f9",
              }}
            >
              {[...Array(5)].map((_, j) => (
                <td
                  key={j}
                  style={{
                    padding: "2.5mm 3mm",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  　
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "6mm",
        }}
      >
        <table
          style={{
            fontSize: "9.5pt",
            borderCollapse: "collapse",
            minWidth: "80mm",
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: "2mm 4mm",
                  borderBottom: "1px solid #ddd",
                  color: "#555",
                }}
              >
                小計
              </td>
              <td
                style={{
                  padding: "2mm 4mm",
                  borderBottom: "1px solid #ddd",
                  textAlign: "right",
                }}
              >
                ¥{subtotal.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "2mm 4mm",
                  borderBottom: "1px solid #ddd",
                  color: "#555",
                }}
              >
                消費税（{taxRate}%）
              </td>
              <td
                style={{
                  padding: "2mm 4mm",
                  borderBottom: "1px solid #ddd",
                  textAlign: "right",
                }}
              >
                ¥{tax.toLocaleString()}
              </td>
            </tr>
            <tr style={{ background: "#f0f0f0" }}>
              <td
                style={{
                  padding: "3mm 4mm",
                  fontWeight: 700,
                  borderTop: "2px solid #111",
                }}
              >
                合計（税込）
              </td>
              <td
                style={{
                  padding: "3mm 4mm",
                  textAlign: "right",
                  fontWeight: 700,
                  fontSize: "12pt",
                  borderTop: "2px solid #111",
                }}
              >
                ¥{total.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {notes && (
        <div
          style={{
            borderTop: "1px solid #ccc",
            paddingTop: "4mm",
            fontSize: "9pt",
            color: "#444",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "2mm" }}>備考</div>
          {notes.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}
