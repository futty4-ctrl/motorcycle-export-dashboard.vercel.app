"use client"

import { useState, useEffect, useRef } from "react"
import type { KobutsuEntry, KobutsuSettings } from "@/types/kobutsu"
import Link from "next/link"
import {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  searchEntries,
  markCertIssued,
  getSettings,
} from "@/lib/kobutsu"
import { toWareki } from "@/lib/wareki"
import {
  C,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  inp,
  btn,
  badge,
  table as tableStyle,
  th,
  td,
  lbl,
} from "@/components/ui-system"

type Tab = "list" | "form" | "cert"

const ID_TYPES = [
  "運転免許証",
  "健康保険証",
  "マイナンバーカード",
  "パスポート",
  "住民票",
  "その他",
]

const emptyForm: Partial<KobutsuEntry> = {
  transaction_date: new Date().toISOString().split("T")[0],
  transaction_type: "受入",
  price: 0,
  maker: "",
  model: "",
  katashiki: "",
  frame_no: "",
  engine_no: "",
  displacement: "",
  model_year: "",
  body_color: "",
  counterparty_name: "",
  counterparty_address: "",
  counterparty_tel: "",
  counterparty_occupation: "",
  id_type: "運転免許証",
  id_number: "",
  notes: "",
}

export function KobutsuContent() {
  const [tab, setTab] = useState<Tab>("list")
  const [entries, setEntries] = useState<KobutsuEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<Partial<KobutsuEntry>>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [certEntry, setCertEntry] = useState<KobutsuEntry | null>(null)
  const [certVehicleType, setCertVehicleType] = useState("")
  const [certMode, setCertMode] = useState<"sales" | "transfer">("sales")
  const [settings, setSettings] = useState<KobutsuSettings | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    const { data } = search
      ? await searchEntries(search)
      : await getEntries()
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    getSettings().then(({ data }) => { if (data) setSettings(data) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    if (editId) {
      await updateEntry(editId, form)
    } else {
      await createEntry(form)
    }
    setSaving(false)
    setForm(emptyForm)
    setEditId(null)
    setTab("list")
    load()
  }

  const handleEdit = (entry: KobutsuEntry) => {
    setForm({
      transaction_date: entry.transaction_date,
      transaction_type: entry.transaction_type,
      price: entry.price,
      maker: entry.maker,
      model: entry.model,
      katashiki: entry.katashiki,
      frame_no: entry.frame_no,
      engine_no: entry.engine_no,
      displacement: entry.displacement,
      model_year: entry.model_year,
      body_color: entry.body_color,
      counterparty_name: entry.counterparty_name,
      counterparty_address: entry.counterparty_address,
      counterparty_tel: entry.counterparty_tel,
      counterparty_occupation: entry.counterparty_occupation,
      id_type: entry.id_type,
      id_number: entry.id_number,
      notes: entry.notes,
    })
    setEditId(entry.id)
    setTab("form")
  }

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return
    await deleteEntry(id)
    load()
  }

  const handleCert = (entry: KobutsuEntry) => {
    setCertEntry(entry)
    setCertVehicleType(entry.displacement ? getVehicleType(entry.displacement) : "")
    setTab("cert")
  }

  const handlePrint = async () => {
    if (certEntry && !certEntry.cert_issued) {
      await markCertIssued(certEntry.id)
      setCertEntry({ ...certEntry, cert_issued: true, cert_issued_at: new Date().toISOString() })
      load()
    }
    window.print()
  }

  const [pdfGenerating, setPdfGenerating] = useState(false)

  const handlePdfDownload = async () => {
    if (!printRef.current || !certEntry) return
    setPdfGenerating(true)

    try {
      if (certEntry && !certEntry.cert_issued) {
        await markCertIssued(certEntry.id)
        setCertEntry({ ...certEntry, cert_issued: true, cert_issued_at: new Date().toISOString() })
        load()
      }

      const html2canvas = (await import("html2canvas-pro")).default
      const { jsPDF } = await import("jspdf")

      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = 210
      const pageHeight = 297

      // Page 1: certificate — scale to fit A4
      const canvas1 = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      })
      const ratio1 = canvas1.height / canvas1.width
      let imgWidth = pageWidth
      let imgHeight = imgWidth * ratio1
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight
        imgWidth = imgHeight / ratio1
      }
      const x1 = (pageWidth - imgWidth) / 2
      pdf.addImage(canvas1.toDataURL("image/jpeg", 0.95), "JPEG", x1, 0, imgWidth, imgHeight)


      const prefix = certMode === "sales" ? "販売証明書" : "譲渡証明書"
      const fileName = `${prefix}_${certEntry.maker}_${certEntry.model}_${certEntry.transaction_date}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error("PDF generation failed:", err)
      alert("PDF生成に失敗しました。印刷機能をお使いください。")
    } finally {
      setPdfGenerating(false)
    }
  }

  const handleBlankPdf = async () => {
    if (!printRef.current) return
    setPdfGenerating(true)

    // Temporarily clear certEntry to render blank template
    const prevEntry = certEntry
    setCertEntry(null)

    // Wait for re-render
    await new Promise((r) => setTimeout(r, 100))

    try {
      const html2canvas = (await import("html2canvas-pro")).default
      const { jsPDF } = await import("jspdf")

      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = 210
      const pageHeight = 297

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      })
      const ratio = canvas.height / canvas.width
      let bW = pageWidth
      let bH = bW * ratio
      if (bH > pageHeight) {
        bH = pageHeight
        bW = bH / ratio
      }
      const bX = (pageWidth - bW) / 2
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", bX, 0, bW, bH)

      const blankPrefix = certMode === "sales" ? "販売証明書" : "譲渡証明書"
      pdf.save(`${blankPrefix}_空テンプレート.pdf`)
    } catch (err) {
      console.error("PDF generation failed:", err)
      alert("PDF生成に失敗しました")
    } finally {
      // Restore previous entry
      setCertEntry(prevEntry)
      setPdfGenerating(false)
    }
  }

  const setField = (key: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const tabs: { key: Tab; label: string }[] = [
    { key: "list", label: "台帳一覧" },
    { key: "form", label: editId ? "編集" : "新規登録" },
    { key: "cert", label: "販売証明書" },
  ]

  return (
    <>
      <div style={pageWrapper} className="kobutsu-screen">
        <h1 style={pageTitle}>
          📋 古物台帳
        </h1>
        <p style={pageSub}>古物営業法に基づく台帳管理・販売証明書発行</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, alignItems: "center" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === "form" && tab !== "form") {
                  setForm(emptyForm)
                  setEditId(null)
                }
                setTab(t.key)
              }}
              style={{
                padding: "8px 20px",
                borderRadius: 6,
                border: `1px solid ${tab === t.key ? C.orange : C.border}`,
                background: tab === t.key ? `${C.orange}18` : "transparent",
                color: tab === t.key ? C.orange : C.textSub,
                fontSize: 13,
                fontWeight: tab === t.key ? "bold" : "normal",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <Link
              href="/kobutsu/settings"
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                color: C.textSub,
                fontSize: 12,
                textDecoration: "none",
              }}
            >
              古物商設定
            </Link>
          </div>
        </div>

        {/* Tab: List */}
        {tab === "list" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <input
                style={{ ...inp, maxWidth: 360 }}
                placeholder="車名・車台番号・相手方名で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <p style={{ color: C.textMuted, fontSize: 13 }}>読み込み中...</p>
            ) : entries.length === 0 ? (
              <div style={{ ...card(), textAlign: "center", padding: 40 }}>
                <p style={{ color: C.textMuted, fontSize: 13 }}>
                  {search ? "該当するデータがありません" : "データがありません。新規登録してください。"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="kobutsu-table-desktop" style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={th}>日付</th>
                        <th style={th}>区分</th>
                        <th style={th}>車名</th>
                        <th style={th}>車台番号</th>
                        <th style={th}>相手方</th>
                        <th style={th}>金額</th>
                        <th style={th}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr
                          key={e.id}
                          style={{ transition: "background 0.15s" }}
                          onMouseEnter={(ev) =>
                            (ev.currentTarget.style.background = C.surfaceHover)
                          }
                          onMouseLeave={(ev) =>
                            (ev.currentTarget.style.background = "transparent")
                          }
                        >
                          <td style={td}>{e.transaction_date}</td>
                          <td style={td}>
                            <span
                              style={badge(
                                e.transaction_type === "受入" ? C.green : C.red
                              )}
                            >
                              {e.transaction_type}
                            </span>
                          </td>
                          <td style={td}>
                            {e.maker} {e.model}
                          </td>
                          <td style={{ ...td, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                            {e.frame_no}
                          </td>
                          <td style={td}>{e.counterparty_name}</td>
                          <td style={{ ...td, textAlign: "right" }}>
                            ¥{(e.price || 0).toLocaleString()}
                          </td>
                          <td style={td}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => handleEdit(e)}
                                style={{
                                  ...btn("ghost"),
                                  padding: "4px 10px",
                                  fontSize: 11,
                                }}
                              >
                                編集
                              </button>
                              {e.transaction_type === "払出" && (
                                <button
                                  onClick={() => handleCert(e)}
                                  style={{
                                    ...btn("primary"),
                                    padding: "4px 10px",
                                    fontSize: 11,
                                  }}
                                >
                                  証明書
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(e.id)}
                                style={{
                                  ...btn("danger"),
                                  padding: "4px 10px",
                                  fontSize: 11,
                                }}
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="kobutsu-cards-mobile">
                  {entries.map((e) => (
                    <div key={e.id} style={{ ...card(), padding: 16, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: C.textMuted }}>{e.transaction_date}</span>
                        <span style={badge(e.transaction_type === "受入" ? C.green : C.red)}>
                          {e.transaction_type}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: "bold", color: C.text, marginBottom: 4 }}>
                        {e.maker} {e.model}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSub, marginBottom: 4 }}>
                        車台番号: {e.frame_no}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: C.textSub }}>{e.counterparty_name}</span>
                        <span style={{ fontSize: 14, fontWeight: "bold", color: C.orange }}>
                          ¥{(e.price || 0).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleEdit(e)} style={{ ...btn("ghost"), padding: "4px 10px", fontSize: 11, flex: 1 }}>
                          編集
                        </button>
                        {e.transaction_type === "払出" && (
                          <button onClick={() => handleCert(e)} style={{ ...btn("primary"), padding: "4px 10px", fontSize: 11, flex: 1 }}>
                            証明書
                          </button>
                        )}
                        <button onClick={() => handleDelete(e.id)} style={{ ...btn("danger"), padding: "4px 10px", fontSize: 11, flex: 1 }}>
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Form */}
        {tab === "form" && (
          <div style={card()}>
            <h2 style={{ fontSize: 16, fontWeight: "bold", color: C.text, marginBottom: 20 }}>
              {editId ? "台帳編集" : "新規登録"}
            </h2>

            {/* 取引情報 */}
            <SectionTitle>取引情報</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              <Field label="取引日">
                <input
                  type="date"
                  style={inp}
                  value={form.transaction_date || ""}
                  onChange={(e) => setField("transaction_date", e.target.value)}
                />
              </Field>
              <Field label="区分">
                <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
                  {(["受入", "払出"] as const).map((t) => (
                    <label
                      key={t}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                        color: form.transaction_type === t ? (t === "受入" ? C.green : C.red) : C.textSub,
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="radio"
                        name="transaction_type"
                        checked={form.transaction_type === t}
                        onChange={() => setField("transaction_type", t)}
                        style={{ accentColor: C.orange }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="金額">
                <input
                  type="number"
                  style={inp}
                  value={form.price || ""}
                  onChange={(e) => setField("price", Number(e.target.value))}
                  placeholder="0"
                />
              </Field>
            </div>

            {/* 車両情報 */}
            <SectionTitle>車両情報</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <Field label="車名（メーカー）">
                <input style={inp} value={form.maker || ""} onChange={(e) => setField("maker", e.target.value)} placeholder="HONDA" />
              </Field>
              <Field label="車種名">
                <input style={inp} value={form.model || ""} onChange={(e) => setField("model", e.target.value)} placeholder="CB400SF" />
              </Field>
              <Field label="型式">
                <input style={inp} value={form.katashiki || ""} onChange={(e) => setField("katashiki", e.target.value)} placeholder="NC39" />
              </Field>
              <Field label="車台番号">
                <input style={inp} value={form.frame_no || ""} onChange={(e) => setField("frame_no", e.target.value)} placeholder="NC39-1234567" />
              </Field>
              <Field label="エンジン番号">
                <input style={inp} value={form.engine_no || ""} onChange={(e) => setField("engine_no", e.target.value)} />
              </Field>
              <Field label="排気量">
                <input style={inp} value={form.displacement || ""} onChange={(e) => setField("displacement", e.target.value)} placeholder="399cc" />
              </Field>
              <Field label="年式">
                <input style={inp} value={form.model_year || ""} onChange={(e) => setField("model_year", e.target.value)} placeholder="2005" />
              </Field>
              <Field label="車体色">
                <input style={inp} value={form.body_color || ""} onChange={(e) => setField("body_color", e.target.value)} placeholder="黒" />
              </Field>
            </div>

            {/* 相手方情報 */}
            <SectionTitle>相手方情報</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <Field label="氏名">
                <input style={inp} value={form.counterparty_name || ""} onChange={(e) => setField("counterparty_name", e.target.value)} />
              </Field>
              <Field label="電話番号">
                <input style={inp} value={form.counterparty_tel || ""} onChange={(e) => setField("counterparty_tel", e.target.value)} placeholder="090-1234-5678" />
              </Field>
              <Field label="住所" >
                <input style={inp} value={form.counterparty_address || ""} onChange={(e) => setField("counterparty_address", e.target.value)} />
              </Field>
              <Field label="職業">
                <input style={inp} value={form.counterparty_occupation || ""} onChange={(e) => setField("counterparty_occupation", e.target.value)} />
              </Field>
            </div>

            {/* 本人確認 */}
            <SectionTitle>本人確認</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <Field label="確認書類">
                <select
                  style={inp}
                  value={form.id_type || "運転免許証"}
                  onChange={(e) => setField("id_type", e.target.value)}
                >
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="番号">
                <input style={inp} value={form.id_number || ""} onChange={(e) => setField("id_number", e.target.value)} />
              </Field>
            </div>

            {/* 備考 */}
            <SectionTitle>備考</SectionTitle>
            <div style={{ marginBottom: 24 }}>
              <textarea
                style={{ ...inp, minHeight: 80, resize: "vertical" }}
                value={form.notes || ""}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...btn("primary"), opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "保存中..." : editId ? "更新する" : "登録する"}
              </button>
              <button
                onClick={() => {
                  setForm(emptyForm)
                  setEditId(null)
                  setTab("list")
                }}
                style={btn("ghost")}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* Tab: Certificate */}
        {tab === "cert" && (
          <div>
            {/* Sales / Transfer toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {(["sales", "transfer"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setCertMode(m)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 6,
                    border: `1px solid ${certMode === m ? C.orange : C.border}`,
                    background: certMode === m ? `${C.orange}18` : "transparent",
                    color: certMode === m ? C.orange : C.textSub,
                    fontSize: 12,
                    fontWeight: certMode === m ? "bold" : "normal",
                    cursor: "pointer",
                  }}
                >
                  {m === "sales" ? "販売証明書" : "譲渡証明書"}
                </button>
              ))}
            </div>

            {!certEntry ? (
              <div style={{ ...card(), textAlign: "center", padding: 40 }}>
                <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
                  台帳一覧から「証明書」ボタンで表示するレコードを選択してください
                </p>
                <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 16 }}>または</p>
                <button
                  onClick={handleBlankPdf}
                  disabled={pdfGenerating}
                  style={{ ...btn("ghost"), opacity: pdfGenerating ? 0.6 : 1 }}
                >
                  {pdfGenerating ? "PDF生成中..." : `空の${certMode === "sales" ? "販売" : "譲渡"}証明書をPDF出力`}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <button
                    onClick={handlePdfDownload}
                    disabled={pdfGenerating}
                    style={{ ...btn("primary"), opacity: pdfGenerating ? 0.6 : 1 }}
                  >
                    {pdfGenerating ? "PDF生成中..." : "PDFダウンロード"}
                  </button>
                  <button onClick={handlePrint} style={btn("ghost")}>
                    印刷
                  </button>
                  <button
                    onClick={handleBlankPdf}
                    disabled={pdfGenerating}
                    style={{ ...btn("ghost"), opacity: pdfGenerating ? 0.6 : 1 }}
                  >
                    空の証明書
                  </button>
                  {certEntry.cert_issued && (
                    <span style={{ ...badge(C.green), alignSelf: "center" }}>
                      発行済み {certEntry.cert_issued_at ? toWareki(certEntry.cert_issued_at) : ""}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: C.textSub }}>種類：</span>
                  {VEHICLE_TYPES.map((t) => (
                    <label
                      key={t}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: "pointer",
                        color: certVehicleType === t ? C.orange : C.textSub,
                        fontSize: 12,
                      }}
                    >
                      <input
                        type="radio"
                        name="cert_vehicle_type"
                        checked={certVehicleType === t}
                        onChange={() => setCertVehicleType(certVehicleType === t ? "" : t)}
                        style={{ accentColor: C.orange }}
                      />
                      {t}
                    </label>
                  ))}
                  <button
                    onClick={() => setCertVehicleType("")}
                    style={{ ...btn("ghost"), padding: "2px 8px", fontSize: 11 }}
                  >
                    クリア
                  </button>
                </div>
              </>
            )}

            {/* Certificate preview (shared for filled & blank) */}
            <div
              ref={printRef}
              className="kobutsu-cert"
              style={{
                background: "#fff",
                color: "#000",
                padding: "48px 56px",
                borderRadius: 8,
                fontFamily: "'Yu Mincho', 'Hiragino Mincho ProN', serif",
                fontSize: 14,
                lineHeight: 1.8,
                maxWidth: 720,
                display: certEntry || tab === "cert" ? "block" : "none",
              }}
            >
              <h2
                style={{
                  textAlign: "center",
                  fontSize: 20,
                  fontWeight: "bold",
                  letterSpacing: "0.3em",
                  marginBottom: 32,
                  borderBottom: "3px double #000",
                  paddingBottom: 8,
                  display: "inline-block",
                  width: "100%",
                }}
              >
                {certMode === "sales" ? "原動機付自転車販売証明書" : "譲 渡 証 明 書"}
              </h2>

              {certMode === "transfer" && (
                <p style={{ marginBottom: 20, fontSize: 13 }}>
                  下記の原動機付自転車を譲渡したことを証明します。
                </p>
              )}

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: 24,
                  border: "2px solid #000",
                }}
              >
                <tbody>
                  {certMode === "sales" ? (
                    <>
                      <CertRow label="車　名" value={certEntry ? `${certEntry.maker} ${certEntry.model}` : ""} label2="車台番号" value2={certEntry?.frame_no || ""} />
                      <tr>
                        <td style={certLabelCell}>型　式</td>
                        <td style={certValueCell}>{certEntry?.katashiki || ""}</td>
                        <td style={certLabelCell}>種　類</td>
                        <td style={{ ...certValueCell, fontSize: 11, lineHeight: 1.6 }}>
                          {VEHICLE_TYPES.map((t) => (
                            <span key={t} style={{ marginRight: 8, whiteSpace: "nowrap" }}>
                              {certVehicleType === t ? "☑" : "☐"} {t}
                            </span>
                          ))}
                        </td>
                      </tr>
                      <tr>
                        <td style={certLabelCell}>販売年月日</td>
                        <td style={certValueCell}>
                          {certEntry ? toWareki(certEntry.transaction_date) : "令和　　年　　月　　日"}
                        </td>
                        <td style={certLabelCell}>排気量</td>
                        <td style={certValueCell}>{certEntry?.displacement || ""}</td>
                      </tr>
                      <tr>
                        <td rowSpan={2} style={{ ...certLabelCell, verticalAlign: "top" }}>購入者</td>
                        <td colSpan={3} style={{ ...certValueCell, minHeight: 32 }}>
                          住所：{certEntry?.counterparty_address || ""}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ ...certValueCell, minHeight: 32 }}>
                          氏名：{certEntry?.counterparty_name || ""}
                        </td>
                      </tr>
                      <tr>
                        <td style={certLabelCell}>備　考</td>
                        <td colSpan={3} style={{ ...certValueCell, minHeight: 40 }}>
                          {certEntry?.notes || ""}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td colSpan={4} style={certSectionHeader}>車両情報</td>
                      </tr>
                      <CertRow label="車　名" value={certEntry ? `${certEntry.maker} ${certEntry.model}` : ""} label2="車台番号" value2={certEntry?.frame_no || ""} />
                      <CertRow label="型　式" value={certEntry?.katashiki || ""} label2="排気量" value2={certEntry?.displacement || ""} />
                      <tr>
                        <td style={certLabelCell}>種　類</td>
                        <td style={{ ...certValueCell, fontSize: 11, lineHeight: 1.6 }} colSpan={3}>
                          {VEHICLE_TYPES.map((t) => (
                            <span key={t} style={{ marginRight: 8, whiteSpace: "nowrap" }}>
                              {certVehicleType === t ? "☑" : "☐"} {t}
                            </span>
                          ))}
                        </td>
                      </tr>
                      <CertRow label="標識番号" value="" label2="譲渡年月日" value2={certEntry ? toWareki(certEntry.transaction_date) : "令和　　年　　月　　日"} />
                      <tr>
                        <td colSpan={4} style={certSectionHeader}>譲渡人（旧所有者）</td>
                      </tr>
                      <tr>
                        <td style={certLabelCell}>住所</td>
                        <td colSpan={3} style={{ ...certValueCell, minHeight: 32 }}>
                          {settings?.address || ""}
                        </td>
                      </tr>
                      <tr>
                        <td style={certLabelCell}>氏名</td>
                        <td style={certValueCell}>{settings?.owner_name || ""}</td>
                        <td style={certLabelCell}>電話番号</td>
                        <td style={certValueCell}>{settings?.tel || ""}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} style={certSectionHeader}>譲受人（新所有者）</td>
                      </tr>
                      <tr>
                        <td style={certLabelCell}>住所</td>
                        <td colSpan={3} style={{ ...certValueCell, minHeight: 32 }}>
                          {certEntry?.counterparty_address || ""}
                        </td>
                      </tr>
                      <tr>
                        <td style={certLabelCell}>氏名</td>
                        <td style={certValueCell}>{certEntry?.counterparty_name || ""}</td>
                        <td style={certLabelCell}>電話番号</td>
                        <td style={certValueCell}>{certEntry?.counterparty_tel || ""}</td>
                      </tr>
                      <tr>
                        <td style={certLabelCell}>備　考</td>
                        <td colSpan={3} style={{ ...certValueCell, minHeight: 40 }}>
                          {certEntry?.notes || ""}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              <div style={{ display: "flex", gap: 24, marginTop: 24, alignItems: "flex-start" }}>
                {settings?.license_image_url && (
                  <div style={{ flex: "0 0 auto" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.license_image_url}
                      alt="古物商許可証"
                      style={{ width: 220, objectFit: "contain", border: "1px solid #ccc" }}
                    />
                    <p style={{ fontSize: 10, color: "#666", marginTop: 4, textAlign: "center" }}>古物商許可証写し</p>
                  </div>
                )}
                <div style={{ flex: 1, textAlign: "right", lineHeight: 2.2, fontSize: 13 }}>
                  <div>販売店名：{settings?.shop_name || "（未設定）"}</div>
                  <div>住所：{settings?.address || "（未設定）"}</div>
                  <div>TEL：{settings?.tel || "（未設定）"}</div>
                  <div>氏名：{settings?.owner_name || "（未設定）"}</div>
                  <div>古物商許可番号：第{settings?.license_number || "○○○○○○"}号</div>
                  <div>{settings?.public_safety_commission || "○○公安委員会"}</div>
                  <div style={{ marginTop: 16, borderTop: "1px solid #000", display: "inline-block", paddingTop: 4, minWidth: 160, textAlign: "center" }}>
                    （印）
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print styles injected via global style tag */}
      <style jsx global>{`
        .kobutsu-cards-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          .kobutsu-table-desktop {
            display: none;
          }
          .kobutsu-cards-mobile {
            display: block;
          }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .kobutsu-cert,
          .kobutsu-cert *,
          .kobutsu-cert-page2,
          .kobutsu-cert-page2 * {
            visibility: visible !important;
          }
          .kobutsu-cert {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            padding: 20mm 25mm !important;
            background: #fff !important;
          }
          .kobutsu-cert-page2 {
            position: absolute;
            left: 0;
            top: 297mm;
            width: 210mm;
            padding: 20mm 25mm !important;
            background: #fff !important;
            page-break-before: always;
          }
          .kobutsu-screen > *:not(.kobutsu-cert):not(.kobutsu-cert-page2) {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

/* Sub-components */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: "bold",
        color: C.orange,
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 6,
        marginBottom: 12,
        letterSpacing: 1,
      }}
    >
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={lbl}>{label}</div>
      {children}
    </div>
  )
}

const certLabelCell: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #999",
  background: "#f5f5f5",
  fontWeight: "bold",
  fontSize: 12,
  width: "15%",
  whiteSpace: "nowrap",
}

const certValueCell: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid #999",
  fontSize: 13,
  width: "35%",
}

const certSectionHeader: React.CSSProperties = {
  padding: "6px 12px",
  background: "#e5e5e5",
  border: "1px solid #999",
  fontWeight: "bold",
  fontSize: 12,
  textAlign: "center",
  letterSpacing: 2,
}

function CertRow({
  label,
  value,
  label2,
  value2,
}: {
  label: string
  value: string
  label2: string
  value2: string
}) {
  return (
    <tr>
      <td style={certLabelCell}>{label}</td>
      <td style={certValueCell}>{value}</td>
      <td style={certLabelCell}>{label2}</td>
      <td style={certValueCell}>{value2}</td>
    </tr>
  )
}

function getVehicleType(displacement: string): string {
  const cc = parseInt(displacement.replace(/[^0-9]/g, ""), 10)
  if (isNaN(cc)) return ""
  if (cc <= 50) return "第一種（50cc）"
  if (cc <= 90) return "第二種乙（～90cc）"
  return "第二種甲（～125cc）"
}

const VEHICLE_TYPES = [
  "第一種（50cc）",
  "第二種乙（～90cc）",
  "第二種甲（～125cc）",
  "ミニカー",
  "小型特殊",
]
