"use client"

import { useState, useEffect } from "react"
import { C, font, card, lbl, kpiCard } from "@/components/ui-system"

type Log = {
  id: string
  date: string
  type: "memo" | "review" | "chat"
  content: string
  ai_response: string
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  memo: "💡 メモ・アイデア",
  review: "📅 振り返り",
  chat: "💬 相談",
}
const TYPE_COLOR: Record<string, string> = {
  memo: C.orange,
  review: C.blue,
  chat: C.green,
}

export function SecretariatContent() {
  const [tab, setTab] = useState<"memo" | "review" | "chat">("review")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState("")
  const [logs, setLogs] = useState<Log[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<Log | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const loadLogs = async () => {
    setLogsLoading(true)
    const res = await fetch("/api/secretary")
    const data = await res.json()
    if (data.success) setLogs(data.logs)
    setLogsLoading(false)
  }

  useEffect(() => { loadLogs() }, [])

  const handleSubmit = async () => {
    if (!content.trim()) return
    setLoading(true)
    setAiResponse("")
    try {
      const res = await fetch("/api/secretary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, content, date: today }),
      })
      const data = await res.json()
      if (data.success) {
        setAiResponse(data.response)
        setContent("")
        loadLogs()
      } else {
        setAiResponse(`エラー: ${data.error}`)
      }
    } catch {
      setAiResponse("通信エラーが発生しました")
    }
    setLoading(false)
  }

  const tabStyle = (t: string) => ({
    padding: "10px 20px",
    borderRadius: 8,
    border: `1px solid ${tab === t ? TYPE_COLOR[t] : C.border}`,
    background: tab === t ? `${TYPE_COLOR[t]}18` : "transparent",
    color: tab === t ? TYPE_COLOR[t] : C.textSub,
    fontFamily: font,
    fontSize: 13,
    fontWeight: tab === t ? 700 : 400,
    cursor: "pointer",
    transition: "all 0.15s",
  } as const)

  const placeholders: Record<string, string> = {
    memo: "思いついたアイデアや気になることを自由に書いてください...\n例）グーバイクで固定価格販売を試してみたい\n例）カブ系は輸出需要高そう",
    review: "今日の振り返りを書いてください...\n例）BDS大阪で3台仕入れた。モンキーが予算内で取れた。ゴリラは競られて逃した。ヤフオクは今週2台売れた。",
    chat: "秘書に相談したいことを書いてください...\n例）月40台に増やすには何から始めればいい？",
  }

  return (
    <div style={{ fontFamily: font, color: C.text, padding: "28px 32px", maxWidth: 960 }}>
      <div style={{ fontSize: 24, fontWeight: "bold", marginBottom: 4 }}>秘書室</div>
      <div style={{ fontSize: 12, color: C.textSub, marginBottom: 28 }}>
        振り返り・アイデア・相談 → AIが分析・提案
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>

        {/* LEFT */}
        <div>
          {/* タブ */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["review", "memo", "chat"] as const).map((t) => (
              <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {/* 入力 */}
          <div style={{ ...card(), marginBottom: 0 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{today}</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholders[tab]}
              style={{
                width: "100%",
                minHeight: 180,
                background: "#0a0a0b",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 14,
                color: C.text,
                fontFamily: font,
                fontSize: 13,
                lineHeight: 1.8,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                onClick={handleSubmit}
                disabled={loading || !content.trim()}
                style={{
                  padding: "11px 28px",
                  background: loading ? C.border : TYPE_COLOR[tab],
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontFamily: font,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {loading ? "分析中..." : "AIに投げる →"}
              </button>
            </div>
          </div>

          {/* AI返答 */}
          {aiResponse && (
            <div
              style={{
                marginTop: 16,
                padding: 20,
                background: `${C.green}08`,
                border: `1px solid ${C.green}30`,
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>
                AI秘書からの提案
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: C.text,
                  lineHeight: 1.9,
                  whiteSpace: "pre-wrap",
                }}
              >
                {aiResponse}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: ログ */}
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, marginBottom: 12 }}>
            HISTORY
          </div>
          {logsLoading ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>読み込み中...</div>
          ) : logs.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>まだログがありません</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  style={{
                    padding: "12px 16px",
                    background: selectedLog?.id === log.id ? `${TYPE_COLOR[log.type]}10` : C.surface,
                    border: `1px solid ${selectedLog?.id === log.id ? TYPE_COLOR[log.type] + "40" : C.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: TYPE_COLOR[log.type], fontWeight: 700 }}>
                      {TYPE_LABEL[log.type]}
                    </span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{log.date}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.textSub,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {log.content}
                  </div>

                  {/* 展開表示 */}
                  {selectedLog?.id === log.id && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap", marginBottom: 10 }}>
                        {log.content}
                      </div>
                      {log.ai_response && (
                        <>
                          <div style={{ fontSize: 10, color: C.green, fontWeight: 700, marginBottom: 6 }}>AI提案</div>
                          <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                            {log.ai_response}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
