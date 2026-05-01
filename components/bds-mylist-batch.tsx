"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import {
  parseBdsMylistText,
  summarizeMylist,
  type BdsMylistRow,
} from "@/lib/bds-mylist-parser"
import { buildYahooSearchUrlByName } from "@/lib/yahoo-search"
import { calcPartsBidLimit } from "@/lib/bds-parts-fees"
import { C, font, lbl, inp, btn, card, badge, table, th, td } from "@/components/ui-system"

type RowState = {
  estimated: string
  decision: "go" | "hold" | "pass" | null
  searched: boolean
}

type ViewTab = "single" | "set" | "unknown"

const fmt = (n: number) => `¥${n.toLocaleString()}`

export function BdsMylistBatch() {
  const [rows, setRows] = useState<BdsMylistRow[]>([])
  const [rowState, setRowState] = useState<Record<string, RowState>>({})
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ViewTab>("single")
  const [keyword, setKeyword] = useState("")
  const [rawText, setRawText] = useState("")
  const [showRaw, setShowRaw] = useState(false)
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState("")

  const summary = useMemo(() => summarizeMylist(rows), [rows])

  const handleParseText = useCallback((text: string) => {
    setRawText(text)
    const parsed = parseBdsMylistText(text)
    if (parsed.length === 0) {
      toast.error(
        "行が認識できませんでした。下の「抽出テキスト確認」で内容を確認してください"
      )
      setShowRaw(true)
    } else {
      toast.success(`${parsed.length}件パース成功`)
    }
    setRows(parsed)
    setRowState({})
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true)
      try {
        let text = ""
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          const pdfjs = await import("pdfjs-dist")
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
          const buf = await file.arrayBuffer()
          const pdf = await pdfjs.getDocument({ data: buf }).promise
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            text +=
              content.items
                .map((it) =>
                  "str" in it ? (it as { str: string }).str : ""
                )
                .join(" ") + "\n"
          }
          toast.info(
            `PDF読込: ${pdf.numPages}ページ・${text.length}文字`
          )
        } else {
          text = await file.text()
        }
        handleParseText(text)
      } catch (err) {
        toast.error(`読込失敗: ${(err as Error).message}`)
        console.error(err)
      } finally {
        setLoading(false)
      }
    },
    [handleParseText]
  )

  const filteredRows = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return rows
      .filter((r) => r.classification === view)
      .filter((r) => {
        if (!kw) return true
        return (
          r.productName.toLowerCase().includes(kw) ||
          r.maker.toLowerCase().includes(kw) ||
          r.category.toLowerCase().includes(kw) ||
          r.lotNo.includes(kw)
        )
      })
  }, [rows, view, keyword])

  const handleSearch = (row: BdsMylistRow) => {
    const built = buildYahooSearchUrlByName(row.searchKeyword)
    window.open(built.url, "_blank", "noopener,noreferrer")
    setRowState((prev) => ({
      ...prev,
      [row.lotNo]: {
        ...(prev[row.lotNo] ?? { estimated: "", decision: null, searched: false }),
        searched: true,
      },
    }))
  }

  const updateState = (lotNo: string, patch: Partial<RowState>) => {
    setRowState((prev) => {
      const base: RowState = prev[lotNo] ?? {
        estimated: "",
        decision: null,
        searched: false,
      }
      return {
        ...prev,
        [lotNo]: { ...base, ...patch },
      }
    })
  }

  const goRows = useMemo(
    () =>
      rows.filter(
        (r) => rowState[r.lotNo]?.decision === "go"
      ),
    [rows, rowState]
  )

  const exportGoCsv = () => {
    if (goRows.length === 0) {
      toast.error("「買う」マークがありません")
      return
    }
    const header = [
      "出番",
      "カテゴリ",
      "商品名",
      "メーカー",
      "想定売価",
      "入札上限",
      "落札実績",
    ]
    const lines = [header.join(",")]
    for (const r of goRows) {
      const est = parseInt(rowState[r.lotNo]?.estimated ?? "", 10) || 0
      const limit = est > 0 ? calcPartsBidLimit(est).bidLimit : 0
      lines.push(
        [
          r.lotNo,
          r.category,
          `"${r.productName}"`,
          `"${r.maker}"`,
          est,
          limit,
          r.finalPrice,
        ].join(",")
      )
    }
    const csv = "\uFEFF" + lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bds-buy-list-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tabBtnStyle = (id: ViewTab, color: string): React.CSSProperties => ({
    padding: "8px 14px",
    borderRadius: "8px 8px 0 0",
    border: `1px solid ${C.border}`,
    borderBottom: view === id ? "none" : `1px solid ${C.border}`,
    background: view === id ? C.surface : "transparent",
    color: view === id ? color : C.textMuted,
    cursor: "pointer",
    fontFamily: font,
    fontSize: 12,
    fontWeight: 700,
  })

  return (
    <div>
      <div style={{ ...card(), borderTop: `3px solid ${C.blue}` }}>
        <div style={{ ...lbl, marginBottom: 12, color: C.blue }}>
          📄 BDSマイリストPDF 一括スコアリング
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => setPasteMode(false)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${!pasteMode ? C.blue : C.border}`,
              background: !pasteMode ? `${C.blue}18` : "transparent",
              color: !pasteMode ? C.blue : C.textSub,
              cursor: "pointer",
              fontFamily: font,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            📁 PDFアップロード
          </button>
          <button
            onClick={() => setPasteMode(true)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${pasteMode ? C.blue : C.border}`,
              background: pasteMode ? `${C.blue}18` : "transparent",
              color: pasteMode ? C.blue : C.textSub,
              cursor: "pointer",
              fontFamily: font,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            📋 テキスト貼り付け
          </button>
        </div>
        {!pasteMode ? (
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ""
            }}
            style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}
          />
        ) : (
          <div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="BDSマイリストPDFのテキストを貼り付け（PDFをCtrl+Aでコピーするか、PDFビューアの選択範囲をコピー）"
              style={{
                ...inp,
                minHeight: 100,
                fontFamily: "monospace",
                fontSize: 11,
                marginBottom: 8,
              }}
            />
            <button
              onClick={() => handleParseText(pasteText)}
              disabled={!pasteText.trim()}
              style={btn("primary")}
            >
              パース実行
            </button>
          </div>
        )}
        {loading && (
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
            読込・パース中…
          </div>
        )}
        {rawText && (
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setShowRaw((v) => !v)}
              style={{
                fontSize: 11,
                color: C.textSub,
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              {showRaw ? "▼" : "▶"} 抽出テキスト確認（
              {rawText.length}文字 / 行: {rawText.split("\n").length}）
            </button>
            {showRaw && (
              <textarea
                readOnly
                value={rawText.slice(0, 5000)}
                style={{
                  ...inp,
                  marginTop: 8,
                  minHeight: 200,
                  fontFamily: "monospace",
                  fontSize: 10,
                }}
              />
            )}
          </div>
        )}
        {rows.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              marginTop: 12,
              fontSize: 11,
            }}
          >
            <div>合計 <b>{summary.total}</b></div>
            <div style={{ color: C.green }}>
              🟢 単品 <b>{summary.single}</b>
            </div>
            <div style={{ color: C.yellow }}>
              🟡 セット <b>{summary.set}</b>
            </div>
            <div style={{ color: C.red }}>
              🔴 不明 <b>{summary.unknown}</b>
            </div>
            <div style={{ color: C.orange }}>
              ✅ 買う <b>{goRows.length}</b>
            </div>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 4, marginBottom: -1 }}>
            <button onClick={() => setView("single")} style={tabBtnStyle("single", C.green)}>
              🟢 単品 ({summary.single})
            </button>
            <button onClick={() => setView("set")} style={tabBtnStyle("set", C.yellow)}>
              🟡 セット ({summary.set})
            </button>
            <button onClick={() => setView("unknown")} style={tabBtnStyle("unknown", C.red)}>
              🔴 不明 ({summary.unknown})
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={exportGoCsv}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: `1px solid ${C.orange}40`,
                background: `${C.orange}18`,
                color: C.orange,
                cursor: "pointer",
                fontFamily: font,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ✅ 買うリストCSV出力（{goRows.length}件）
            </button>
          </div>

          <div style={card()}>
            <input
              style={{ ...inp, marginBottom: 12 }}
              placeholder="ロット番号・商品名・カテゴリで絞り込み"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>出番</th>
                    <th style={th}>カテゴリ</th>
                    <th style={th}>商品名</th>
                    <th style={th}>車種</th>
                    <th style={th}>結果</th>
                    <th style={th}>落札実績</th>
                    <th style={th}>想定売価</th>
                    <th style={th}>上限</th>
                    <th style={th}>判定</th>
                    <th style={th}>検索</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 200).map((row) => {
                    const st = rowState[row.lotNo]
                    const est = parseInt(st?.estimated ?? "", 10) || 0
                    const limit = est > 0 ? calcPartsBidLimit(est).bidLimit : 0
                    const decision = st?.decision ?? null
                    return (
                      <tr key={row.lotNo}>
                        <td style={{ ...td, fontFamily: font, fontWeight: 700, color: C.textSub }}>
                          {row.lotNo}
                        </td>
                        <td style={{ ...td, fontSize: 11 }}>{row.category || "—"}</td>
                        <td style={{ ...td, fontSize: 12 }}>{row.productName}</td>
                        <td style={{ ...td, fontSize: 11, color: C.textSub }}>
                          {row.vehicleModel ?? "—"}
                        </td>
                        <td style={td}>
                          {row.result === "落" ? (
                            <span style={{ ...badge(C.green), fontSize: 10 }}>落</span>
                          ) : row.result === "流" ? (
                            <span style={{ ...badge(C.textMuted), fontSize: 10 }}>流</span>
                          ) : "—"}
                        </td>
                        <td style={{ ...td, fontFamily: font, fontSize: 11 }}>
                          {row.finalPrice > 0 ? fmt(row.finalPrice) : "—"}
                        </td>
                        <td style={td}>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={st?.estimated ?? ""}
                            onChange={(e) =>
                              updateState(row.lotNo, { estimated: e.target.value })
                            }
                            placeholder="¥"
                            style={{ ...inp, width: 80, padding: "4px 6px", fontSize: 11 }}
                          />
                        </td>
                        <td
                          style={{
                            ...td,
                            fontFamily: font,
                            fontSize: 11,
                            fontWeight: 700,
                            color: limit > 1000 ? C.green : limit > 0 ? C.yellow : C.textMuted,
                          }}
                        >
                          {limit > 0 ? fmt(limit) : "—"}
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 2 }}>
                            {(["go", "hold", "pass"] as const).map((d) => {
                              const colors = { go: C.green, hold: C.yellow, pass: C.red }
                              const labels = { go: "🟢", hold: "🟡", pass: "🔴" }
                              return (
                                <button
                                  key={d}
                                  onClick={() =>
                                    updateState(row.lotNo, {
                                      decision: decision === d ? null : d,
                                    })
                                  }
                                  style={{
                                    padding: "4px 6px",
                                    borderRadius: 4,
                                    border: `1px solid ${decision === d ? colors[d] : C.border}`,
                                    background: decision === d ? `${colors[d]}25` : "transparent",
                                    cursor: "pointer",
                                    fontSize: 12,
                                  }}
                                >
                                  {labels[d]}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td style={td}>
                          <button
                            onClick={() => handleSearch(row)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 4,
                              border: `1px solid ${st?.searched ? C.orange : C.border}`,
                              background: st?.searched ? `${C.orange}18` : "transparent",
                              color: st?.searched ? C.orange : C.textSub,
                              cursor: "pointer",
                              fontFamily: font,
                              fontSize: 11,
                            }}
                          >
                            🔍
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredRows.length > 200 && (
                <div style={{ fontSize: 11, color: C.textMuted, padding: 8 }}>
                  上位200件のみ表示（絞り込みでさらに対象を絞ってください）
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
