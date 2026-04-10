"use client"

import { useEffect, useState } from "react"
import { C, card, lbl, inp, btn, badge, grid2, grid3, table, th, td, divider } from "./ui-system"
import {
  getDocuments,
  getIssuerPresets,
  deleteDocument,
} from "@/lib/documents"
import type {
  DocumentRecord,
  IssuerPreset,
  EstimateData,
  EstimateItem,
  InvoiceData,
  InvoiceItem,
  ReceiptData,
} from "@/types/document"

type TabKey = "history" | "estimate" | "invoice" | "receipt"
type DocType = "見積書" | "請求書" | "領収書"

const TABS: { key: TabKey; label: string }[] = [
  { key: "history", label: "発行履歴" },
  { key: "estimate", label: "見積書" },
  { key: "invoice", label: "請求書" },
  { key: "receipt", label: "領収書" },
]

const DOC_TYPE_COLOR: Record<DocType, string> = {
  見積書: C.blue,
  請求書: C.orange,
  領収書: C.green,
}

function today(): string {
  return new Date().toISOString().split("T")[0]
}

async function downloadDocx(docType: DocType, data: EstimateData | InvoiceData | ReceiptData) {
  const res = await fetch("/api/documents/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docType, data }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "不明なエラー" }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const cd = res.headers.get("Content-Disposition") || ""
  const match = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/)
  const filename = match ? decodeURIComponent(match[1]) : `${docType}.docx`
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function DocumentForm() {
  const [tab, setTab] = useState<TabKey>("history")
  const [issuers, setIssuers] = useState<IssuerPreset[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  useEffect(() => {
    getIssuerPresets().then((r) => {
      if (r.data) setIssuers(r.data)
    })
  }, [])

  const loadHistory = async () => {
    setLoadingDocs(true)
    const r = await getDocuments()
    if (r.data) setDocuments(r.data)
    setLoadingDocs(false)
  }

  useEffect(() => {
    if (tab === "history") loadHistory()
  }, [tab])

  const issuerOptions = issuers.length > 0 ? issuers : [{ id: "yamanoue", name: "山上" } as IssuerPreset]
  const defaultIssuer = issuers[0]?.id || "yamanoue"

  return (
    <div>
      {/* タブ */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 20,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: "12px 20px",
                background: "none",
                border: "none",
                borderBottom: active ? `2px solid ${C.orange}` : "2px solid transparent",
                color: active ? C.orange : C.textSub,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 13,
                letterSpacing: 0.5,
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "history" && (
        <HistoryTab
          documents={documents}
          loading={loadingDocs}
          reload={loadHistory}
        />
      )}
      {tab === "estimate" && (
        <EstimateTab issuers={issuerOptions} defaultIssuer={defaultIssuer} />
      )}
      {tab === "invoice" && (
        <InvoiceTab issuers={issuerOptions} defaultIssuer={defaultIssuer} />
      )}
      {tab === "receipt" && (
        <ReceiptTab issuers={issuerOptions} defaultIssuer={defaultIssuer} />
      )}
    </div>
  )
}

// ==================== 履歴タブ ====================

function HistoryTab({
  documents,
  loading,
  reload,
}: {
  documents: DocumentRecord[]
  loading: boolean
  reload: () => void
}) {
  const handleDelete = async (id: string) => {
    if (!confirm("この帳票記録を削除しますか？")) return
    const { error } = await deleteDocument(id)
    if (error) {
      alert("削除に失敗しました: " + error.message)
      return
    }
    reload()
  }

  const handleReissue = async (doc: DocumentRecord) => {
    try {
      await downloadDocx(
        doc.doc_type as DocType,
        doc.detail_json as unknown as EstimateData | InvoiceData | ReceiptData
      )
    } catch (e) {
      alert("再発行に失敗しました: " + (e as Error).message)
    }
  }

  return (
    <div style={card()}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 14, color: C.textSub }}>
          {loading ? "読み込み中..." : `${documents.length}件の発行履歴`}
        </div>
        <button type="button" style={btn("ghost")} onClick={reload}>
          更新
        </button>
      </div>

      {documents.length === 0 && !loading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          まだ発行履歴がありません
        </div>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>種別</th>
              <th style={th}>発行日</th>
              <th style={th}>宛名</th>
              <th style={{ ...th, textAlign: "right" }}>金額</th>
              <th style={th}>発行元</th>
              <th style={{ ...th, width: 160 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id}>
                <td style={td}>
                  <span style={badge(DOC_TYPE_COLOR[d.doc_type as DocType] || C.textSub)}>
                    {d.doc_type}
                  </span>
                </td>
                <td style={td}>{d.doc_date}</td>
                <td style={td}>{d.client_name}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  ¥{Number(d.total_amount || 0).toLocaleString()}
                </td>
                <td style={td}>{d.issuer_preset}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      style={{ ...btn("ghost"), padding: "5px 10px", fontSize: 11 }}
                      onClick={() => handleReissue(d)}
                    >
                      再発行
                    </button>
                    <button
                      type="button"
                      style={{ ...btn("danger"), padding: "5px 10px", fontSize: 11 }}
                      onClick={() => handleDelete(d.id)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ==================== 発行元セレクタ ====================

function IssuerSelect({
  value,
  onChange,
  issuers,
}: {
  value: string
  onChange: (v: string) => void
  issuers: IssuerPreset[]
}) {
  return (
    <div>
      <div style={lbl}>発行元</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inp, cursor: "pointer" }}
      >
        {issuers.map((i) => (
          <option key={i.id} value={i.id}>
            {i.display_name || i.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function SubmitRow({
  onSubmit,
  submitting,
  label,
}: {
  onSubmit: () => void
  submitting: boolean
  label: string
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
      <button
        type="button"
        style={btn("primary")}
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? "生成中..." : label}
      </button>
    </div>
  )
}

// ==================== 見積書タブ ====================

function EstimateTab({
  issuers,
  defaultIssuer,
}: {
  issuers: IssuerPreset[]
  defaultIssuer: string
}) {
  const [client, setClient] = useState("")
  const [date, setDate] = useState(today())
  const [validUntil, setValidUntil] = useState("")
  const [schedule, setSchedule] = useState("")
  const [note, setNote] = useState("")
  const [issuerPreset, setIssuerPreset] = useState(defaultIssuer)
  const [items, setItems] = useState<EstimateItem[]>([
    { name: "", detail: "", total: 0, qty: "1", unit: "式" },
  ])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => setIssuerPreset(defaultIssuer), [defaultIssuer])

  const updateItem = (i: number, key: keyof EstimateItem, v: string | number) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: v } : it)))
  }

  const addItem = () =>
    setItems((prev) => [...prev, { name: "", detail: "", total: 0, qty: "1", unit: "式" }])

  const removeItem = (i: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const handleSubmit = async () => {
    if (!client.trim()) {
      alert("宛名を入力してください")
      return
    }
    if (items.every((i) => !i.name.trim())) {
      alert("品名を少なくとも1つ入力してください")
      return
    }
    setSubmitting(true)
    try {
      const data: EstimateData = {
        client,
        date,
        validUntil,
        schedule,
        items: items.filter((i) => i.name.trim()),
        note,
        issuerPreset,
      }
      await downloadDocx("見積書", data)
    } catch (e) {
      alert("生成に失敗しました: " + (e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={card()}>
      <div style={grid2}>
        <div>
          <div style={lbl}>宛名</div>
          <input style={inp} value={client} onChange={(e) => setClient(e.target.value)} placeholder="株式会社〇〇" />
        </div>
        <IssuerSelect value={issuerPreset} onChange={setIssuerPreset} issuers={issuers} />
      </div>
      <div style={grid3}>
        <div>
          <div style={lbl}>発行日</div>
          <input style={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <div style={lbl}>有効期限</div>
          <input style={inp} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} placeholder="発行日より30日間" />
        </div>
        <div>
          <div style={lbl}>作業日程</div>
          <input style={inp} value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="ご相談の上決定" />
        </div>
      </div>

      <div style={divider} />

      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, letterSpacing: 1 }}>
        明細
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div style={{ ...grid2, marginBottom: 10 }}>
            <div>
              <div style={lbl}>品名</div>
              <input style={inp} value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
            </div>
            <div>
              <div style={lbl}>合計金額（税込）</div>
              <input
                style={inp}
                type="number"
                value={it.total || ""}
                onChange={(e) => updateItem(i, "total", Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div style={{ ...grid3, marginBottom: 10 }}>
            <div>
              <div style={lbl}>数量</div>
              <input style={inp} value={it.qty || ""} onChange={(e) => updateItem(i, "qty", e.target.value)} />
            </div>
            <div>
              <div style={lbl}>単位</div>
              <input style={inp} value={it.unit || ""} onChange={(e) => updateItem(i, "unit", e.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" style={btn("danger")} onClick={() => removeItem(i)}>
                行削除
              </button>
            </div>
          </div>
          <div>
            <div style={lbl}>詳細</div>
            <textarea
              style={{ ...inp, minHeight: 60, resize: "vertical" }}
              value={it.detail || ""}
              onChange={(e) => updateItem(i, "detail", e.target.value)}
            />
          </div>
        </div>
      ))}
      <button type="button" style={btn("ghost")} onClick={addItem}>
        ＋ 明細を追加
      </button>

      <div style={divider} />

      <div>
        <div style={lbl}>備考</div>
        <textarea
          style={{ ...inp, minHeight: 70, resize: "vertical" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <SubmitRow onSubmit={handleSubmit} submitting={submitting} label="見積書を生成" />
    </div>
  )
}

// ==================== 請求書タブ ====================

function InvoiceTab({
  issuers,
  defaultIssuer,
}: {
  issuers: IssuerPreset[]
  defaultIssuer: string
}) {
  const [client, setClient] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [invoiceNo, setInvoiceNo] = useState("")
  const [date, setDate] = useState(today())
  const [dueDate, setDueDate] = useState("")
  const [note, setNote] = useState("")
  const [issuerPreset, setIssuerPreset] = useState(defaultIssuer)
  const [items, setItems] = useState<InvoiceItem[]>([
    { name: "", qty: "1", unit: "式", price: 0, amount: 0 },
  ])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => setIssuerPreset(defaultIssuer), [defaultIssuer])

  const updateItem = (i: number, key: keyof InvoiceItem, v: string | number) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it
        const next = { ...it, [key]: v }
        if (key === "price" || key === "qty") {
          const q = Number(String(next.qty).replace(/[^0-9.]/g, "")) || 0
          next.amount = Math.round((Number(next.price) || 0) * q)
        }
        return next
      })
    )
  }

  const addItem = () =>
    setItems((prev) => [...prev, { name: "", qty: "1", unit: "式", price: 0, amount: 0 }])

  const removeItem = (i: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const totalAmount = items.reduce((s, i) => s + (i.amount || 0), 0)

  const handleSubmit = async () => {
    if (!client.trim()) {
      alert("宛名を入力してください")
      return
    }
    if (items.every((i) => !i.name.trim())) {
      alert("品名を少なくとも1つ入力してください")
      return
    }
    setSubmitting(true)
    try {
      const data: InvoiceData = {
        client,
        clientAddress: clientAddress || undefined,
        invoiceNo: invoiceNo || undefined,
        date,
        dueDate,
        items: items.filter((i) => i.name.trim()),
        note,
        issuerPreset,
      }
      await downloadDocx("請求書", data)
    } catch (e) {
      alert("生成に失敗しました: " + (e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={card()}>
      <div style={grid2}>
        <div>
          <div style={lbl}>宛名</div>
          <input style={inp} value={client} onChange={(e) => setClient(e.target.value)} placeholder="株式会社〇〇" />
        </div>
        <IssuerSelect value={issuerPreset} onChange={setIssuerPreset} issuers={issuers} />
      </div>
      <div>
        <div style={lbl}>宛名住所</div>
        <input style={inp} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
      </div>
      <div style={{ ...grid3, marginTop: 16 }}>
        <div>
          <div style={lbl}>請求番号</div>
          <input style={inp} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
        </div>
        <div>
          <div style={lbl}>請求日</div>
          <input style={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <div style={lbl}>支払期限</div>
          <input style={inp} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div style={divider} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 12, color: C.textMuted, letterSpacing: 1 }}>明細</div>
        <div style={{ fontSize: 14, color: C.orange, fontWeight: "bold" }}>
          合計: ¥{totalAmount.toLocaleString()}
        </div>
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div style={{ ...grid2, marginBottom: 10 }}>
            <div>
              <div style={lbl}>品名</div>
              <input style={inp} value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
            </div>
            <div>
              <div style={lbl}>備考</div>
              <input style={inp} value={it.note || ""} onChange={(e) => updateItem(i, "note", e.target.value)} />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <div>
              <div style={lbl}>数量</div>
              <input style={inp} value={it.qty} onChange={(e) => updateItem(i, "qty", e.target.value)} />
            </div>
            <div>
              <div style={lbl}>単位</div>
              <input style={inp} value={it.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} />
            </div>
            <div>
              <div style={lbl}>単価</div>
              <input
                style={inp}
                type="number"
                value={it.price || ""}
                onChange={(e) => updateItem(i, "price", Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <div style={lbl}>金額</div>
              <input
                style={inp}
                type="number"
                value={it.amount || ""}
                onChange={(e) => updateItem(i, "amount", Number(e.target.value) || 0)}
              />
            </div>
            <button type="button" style={btn("danger")} onClick={() => removeItem(i)}>
              削除
            </button>
          </div>
        </div>
      ))}
      <button type="button" style={btn("ghost")} onClick={addItem}>
        ＋ 明細を追加
      </button>

      <div style={divider} />

      <div>
        <div style={lbl}>備考</div>
        <textarea
          style={{ ...inp, minHeight: 70, resize: "vertical" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <SubmitRow onSubmit={handleSubmit} submitting={submitting} label="請求書を生成" />
    </div>
  )
}

// ==================== 領収書タブ ====================

function ReceiptTab({
  issuers,
  defaultIssuer,
}: {
  issuers: IssuerPreset[]
  defaultIssuer: string
}) {
  const [client, setClient] = useState("")
  const [amount, setAmount] = useState<number>(0)
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(today())
  const [issuerPreset, setIssuerPreset] = useState(defaultIssuer)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => setIssuerPreset(defaultIssuer), [defaultIssuer])

  const sub = Math.floor(amount / 1.1)
  const tax = amount - sub

  const handleSubmit = async () => {
    if (!client.trim()) {
      alert("宛名を入力してください")
      return
    }
    if (!amount || amount <= 0) {
      alert("金額を入力してください")
      return
    }
    setSubmitting(true)
    try {
      const data: ReceiptData = {
        client,
        amount,
        description,
        date,
        breakdown: { subtotal: sub, tax },
        issuerPreset,
      }
      await downloadDocx("領収書", data)
    } catch (e) {
      alert("生成に失敗しました: " + (e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={card()}>
      <div style={grid2}>
        <div>
          <div style={lbl}>宛名</div>
          <input style={inp} value={client} onChange={(e) => setClient(e.target.value)} placeholder="山田 太郎" />
        </div>
        <IssuerSelect value={issuerPreset} onChange={setIssuerPreset} issuers={issuers} />
      </div>
      <div style={grid2}>
        <div>
          <div style={lbl}>発行日</div>
          <input style={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <div style={lbl}>金額（税込）</div>
          <input
            style={inp}
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
        </div>
      </div>
      <div>
        <div style={lbl}>但し書き</div>
        <input
          style={inp}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="バイク整備代として"
        />
      </div>

      <div style={divider} />

      <div style={{ display: "flex", gap: 20, fontSize: 13, color: C.textSub }}>
        <div>
          税抜: <span style={{ color: C.text, fontWeight: "bold" }}>¥{sub.toLocaleString()}</span>
        </div>
        <div>
          消費税(10%): <span style={{ color: C.text, fontWeight: "bold" }}>¥{tax.toLocaleString()}</span>
        </div>
        <div>
          合計: <span style={{ color: C.orange, fontWeight: "bold" }}>¥{amount.toLocaleString()}</span>
        </div>
      </div>

      <SubmitRow onSubmit={handleSubmit} submitting={submitting} label="領収書を生成" />
    </div>
  )
}
