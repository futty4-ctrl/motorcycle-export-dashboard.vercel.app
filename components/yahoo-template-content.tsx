"use client"

import { useState } from "react"
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
} from "@/components/ui-system"

// ── 定数 ───────────────────────────────────────────────────────────────────
const CONDITIONS = ["良好", "普通", "難あり", "ジャンク"] as const
const VENUES = ["大阪", "関東", "九州", "名古屋"] as const
const SHIP_OPTIONS = [
  "直接引き渡しのみ（発送不可）",
  "バイク便発送可（着払い）",
  "陸送手配可（要相談）",
] as const
const REASONS = [
  "乗り換えのため",
  "保管スペースの都合",
  "諸事情により手放すことになりました",
  "買い替えに伴い",
  "長期不動のため",
] as const
const STORAGE_OPTIONS = [
  "屋内（ガレージ）保管",
  "屋根付き駐輪場保管",
  "屋外・カバーあり保管",
  "屋外保管",
] as const
const CHECK_ITEMS = [
  "エンジン始動動画あり",
  "走行可能（自走確認済）",
  "自走不可（押し引き可）",
  "書類あり（名義変更可）",
  "廃車済（譲渡証あり）",
  "ナンバー付き",
  "オイル漏れなし",
  "ライト類点灯確認済",
  "ブレーキ前後効きあり",
  "キー・メインスイッチあり",
] as const

function fmtNum(s: string) {
  const n = parseInt(s.replace(/,/g, ""))
  return isNaN(n) ? s : n.toLocaleString()
}

function buildTemplate(p: {
  maker: string; model: string; frame: string; year: string
  cc: string; km: string; reason: string; storage: string
  cond: string; scratch: string; engineNote: string
  buynow: string; venue: string; ship: string; extra: string
  checks: string[]
}) {
  const sep = "━━━━━━━━━━━━━━━━━━━━\n"
  let t = ""

  t += "数ある出品の中からご覧いただきありがとうございます。\n"
  t += "状態・取引ともに誠実に対応いたしますので、どうぞよろしくお願いいたします。\n\n"

  t += "【出品理由】\n"
  t += `${p.reason}、出品することになりました。\n\n`

  t += sep + "■ 車両情報\n" + sep
  t += `メーカー　　：${p.maker || "－"}\n`
  t += `車名　　　　：${p.model || "－"}\n`
  t += `型式　　　　：${p.frame || "－"}\n`
  t += `年式　　　　：${p.year || "－"}\n`
  t += `排気量　　　：${p.cc ? p.cc + "cc" : "－"}\n`
  t += `走行距離　　：${p.km ? fmtNum(p.km) + "km" : "－"}\n`
  t += `保管状況　　：${p.storage}\n\n`

  t += sep + "■ 車両の状態について\n" + sep
  t += `全体的な状態：${p.cond}\n\n`
  if (p.scratch) t += `【外装・傷・サビ】\n${p.scratch}\n\n`
  if (p.engineNote) t += `【エンジン・機関系】\n${p.engineNote}\n\n`
  if (!p.scratch && !p.engineNote) {
    t += "状態詳細は写真・動画にてご確認ください。\n"
    t += "気になる点はご入札前にお気軽にご質問ください。\n\n"
  }

  if (p.checks.length > 0) {
    t += sep + "■ 動作確認済み項目\n" + sep
    p.checks.forEach((c) => { t += `✔ ${c}\n` })
    t += "\n"
  }

  if (p.extra) {
    t += sep + "■ 特記事項・変更点\n" + sep
    t += `${p.extra}\n\n`
  }

  t += sep + "■ 取引について\n" + sep
  t += "・1円スタートにて出品しております\n"
  if (p.buynow) t += `・即決価格：${fmtNum(p.buynow)}円でのご落札も可能です\n`
  t += `・${p.venue}からの出品です\n`
  t += `・引き渡し方法：${p.ship}\n`
  t += "・落札後24時間以内にご連絡ください\n"
  t += "・お支払い確認後、速やかに手配いたします\n\n"

  t += sep + "■ ご購入前にご確認ください\n" + sep
  t += "・中古車のため、経年による傷・汚れ・サビがある場合があります\n"
  t += "・素人による保管・点検のため、見落としがある場合もございます\n"
  t += "・現車確認をご希望の方は、入札前にご相談ください\n"
  t += "・ノークレーム・ノーリターンにてお願いいたします\n"
  t += "・写真・動画をよくご確認の上、ご不明な点は入札前にご質問ください\n\n"

  t += "ご質問はお気軽にどうぞ。誠実に対応いたします。\n"
  t += "ご縁がありましたら、よろしくお願いいたします。\n"

  return t
}

// ── スタイル ─────────────────────────────────────────────────────────────────
const sectionTitle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#f97316",
  marginBottom: 16,
  letterSpacing: "0.03em",
} as const

const formLabel = {
  fontSize: 11,
  color: "#888",
  marginBottom: 5,
  display: "block",
  letterSpacing: "0.05em",
} as const

const inputBase = {
  background: "#222",
  border: "1px solid #2e2e2e",
  borderRadius: 6,
  padding: "9px 12px",
  color: "#f0f0f0",
  fontFamily: "inherit",
  fontSize: 13,
  width: "100%",
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border-color 0.15s",
}

const toggleBtn = (active: boolean) => ({
  padding: "7px 14px",
  borderRadius: 6,
  border: `1px solid ${active ? "#f97316" : "#2e2e2e"}`,
  background: active ? "#f97316" : "#222",
  color: active ? "#fff" : "#888",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
  transition: "all 0.15s",
  fontWeight: active ? 600 : 400,
} as const)

// ── コンポーネント ─────────────────────────────────────────────────────────────
export function YahooTemplateContent() {
  const [maker, setMaker] = useState("")
  const [model, setModel] = useState("")
  const [frame, setFrame] = useState("")
  const [year, setYear] = useState("")
  const [cc, setCc] = useState("")
  const [km, setKm] = useState("")
  const [reason, setReason] = useState<string>(REASONS[0])
  const [storage, setStorage] = useState<string>(STORAGE_OPTIONS[0])
  const [cond, setCond] = useState<string>("良好")
  const [scratch, setScratch] = useState("")
  const [engineNote, setEngineNote] = useState("")
  const [buynow, setBuynow] = useState("")
  const [venue, setVenue] = useState<string>("大阪")
  const [ship, setShip] = useState<string>(SHIP_OPTIONS[0])
  const [extra, setExtra] = useState("")
  const [checks, setChecks] = useState<Record<string, boolean>>({
    "エンジン始動動画あり": true,
    "走行可能（自走確認済）": true,
  })
  const [copied, setCopied] = useState(false)

  const toggleCheck = (item: string) => {
    setChecks((prev) => ({ ...prev, [item]: !prev[item] }))
  }

  const checkedItems = CHECK_ITEMS.filter((c) => checks[c])
  const charCount = scratch.length + engineNote.length

  const template = buildTemplate({
    maker, model, frame, year, cc, km, reason, storage,
    cond, scratch, engineNote, buynow, venue, ship, extra,
    checks: checkedItems,
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(template).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      style={{
        fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif",
        color: "#f0f0f0",
        padding: "24px 32px",
        maxWidth: 1400,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>ヤフオク出品テンプレ生成</div>
      <div style={{ fontSize: 12, color: "#888", display: "flex", gap: 12, marginBottom: 24 }}>
        <span>1円スタート</span>
        <span style={{ color: "#555" }}>/</span>
        <span>7日間</span>
        <span style={{ color: "#555" }}>/</span>
        <span>広告100円×7日</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>

        {/* ── LEFT: フォーム ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* 車両情報 */}
          <div style={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8, padding: 20 }}>
            <div style={sectionTitle}>車両情報</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "メーカー", placeholder: "Honda", value: maker, set: setMaker },
                { label: "車名", placeholder: "モンキー", value: model, set: setModel },
                { label: "型式", placeholder: "AB27", value: frame, set: setFrame },
                { label: "年式", placeholder: "1998年式", value: year, set: setYear },
                { label: "排気量（CC）", placeholder: "50", value: cc, set: setCc },
                { label: "走行距離（KM）", placeholder: "12000", value: km, set: setKm },
              ].map(({ label, placeholder, value, set }) => (
                <div key={label}>
                  <label style={formLabel}>{label}</label>
                  <input
                    style={inputBase}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 出品背景 */}
          <div style={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8, padding: 20 }}>
            <div style={sectionTitle}>
              出品背景{" "}
              <span style={{ color: "#888", fontSize: 11, fontWeight: 400 }}>— 入札者の信頼感を上げる重要項目</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={formLabel}>
                  出品理由{" "}
                  <span style={{ color: "#f97316", fontSize: 10, marginLeft: 4 }}>▲ 信頼感に直結</span>
                </label>
                <select
                  style={{ ...inputBase, cursor: "pointer" }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r} style={{ background: "#222" }}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={formLabel}>
                  保管状況{" "}
                  <span style={{ color: "#f97316", fontSize: 10, marginLeft: 4 }}>▲ 状態の根拠になる</span>
                </label>
                <select
                  style={{ ...inputBase, cursor: "pointer" }}
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                >
                  {STORAGE_OPTIONS.map((s) => (
                    <option key={s} value={s} style={{ background: "#222" }}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 車両状態 */}
          <div style={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8, padding: 20 }}>
            <div style={sectionTitle}>車両状態</div>
            <div style={{ marginBottom: 12 }}>
              <label style={formLabel}>全体的な状態</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {CONDITIONS.map((c) => (
                  <button key={c} style={toggleBtn(cond === c)} onClick={() => setCond(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={formLabel}>
                外装の傷・サビ状況{" "}
                <span style={{ color: "#555", fontSize: 10, marginLeft: 4 }}>（正直に書くほど信頼↑）</span>
              </label>
              <textarea
                style={{ ...inputBase, minHeight: 72, resize: "vertical", lineHeight: 1.6 }}
                placeholder="例：右サイドカバーに小傷あり。タンクは目立つ傷なし。フロントフォークに薄いサビあり（走行に支障なし）"
                value={scratch}
                onChange={(e) => setScratch(e.target.value)}
              />
            </div>
            <div>
              <label style={formLabel}>
                エンジン・機関系の補足{" "}
                <span style={{ color: "#555", fontSize: 10, marginLeft: 4 }}>（任意）</span>
              </label>
              <textarea
                style={{ ...inputBase, minHeight: 56, resize: "vertical", lineHeight: 1.6 }}
                placeholder="例：エンジン一発始動確認済み。アイドリング安定。オイル漏れなし。"
                value={engineNote}
                onChange={(e) => setEngineNote(e.target.value)}
              />
              <div style={{ fontSize: 11, color: "#555", textAlign: "right", marginTop: 3 }}>
                {charCount}文字
              </div>
            </div>
          </div>

          {/* 動作確認チェック */}
          <div style={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8, padding: 20 }}>
            <div style={sectionTitle}>動作確認チェック</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {CHECK_ITEMS.map((item) => {
                const checked = !!checks[item]
                return (
                  <div
                    key={item}
                    onClick={() => toggleCheck(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      background: "#222",
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      style={{ accentColor: "#f97316", width: 14, height: 14, cursor: "pointer", flexShrink: 0 }}
                    />
                    <label style={{ fontSize: 12, color: checked ? "#f0f0f0" : "#888", cursor: "pointer" }}>
                      {item}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 取引情報 */}
          <div style={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8, padding: 20 }}>
            <div style={sectionTitle}>取引情報</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={formLabel}>即決価格（円 / 任意）</label>
                <input
                  style={inputBase}
                  placeholder="例：150000"
                  value={buynow}
                  onChange={(e) => setBuynow(e.target.value)}
                />
              </div>
              <div>
                <label style={formLabel}>出品地域</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                  {VENUES.map((v) => (
                    <button key={v} style={toggleBtn(venue === v)} onClick={() => setVenue(v)}>{v}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label style={formLabel}>引き渡し方法</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                {SHIP_OPTIONS.map((s) => (
                  <button key={s} style={toggleBtn(ship === s)} onClick={() => setShip(s)}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 特記事項 */}
          <div style={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8, padding: 20 }}>
            <div style={sectionTitle}>
              特記事項・変更点{" "}
              <span style={{ color: "#888", fontSize: 11, fontWeight: 400 }}>（カスタム・整備歴・気になる点など）</span>
            </div>
            <textarea
              style={{ ...inputBase, minHeight: 72, resize: "vertical", lineHeight: 1.6 }}
              placeholder="例：純正マフラーから社外品に交換済み。先月キャブのOH実施。メーター周りのゴム類は劣化あり。"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </div>
        </div>

        {/* ── RIGHT: プレビュー ── */}
        <div style={{ position: "sticky", top: 0, alignSelf: "start" }}>
          <div style={{ background: "#1a1a1a", border: "1px solid #2e2e2e", borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#f97316" }}>プレビュー</span>
              <button
                onClick={handleCopy}
                style={{
                  padding: "9px 20px",
                  background: copied ? "#22c55e" : "#f97316",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  transition: "background 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "コピー完了 ✓" : "クリップボードにコピー"}
              </button>
            </div>
            <pre
              style={{
                background: "#222",
                border: "1px solid #2e2e2e",
                borderRadius: 6,
                padding: 16,
                fontSize: 13,
                lineHeight: 2,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: 520,
                color: "#f0f0f0",
                overflowY: "auto",
                maxHeight: 700,
                margin: 0,
                fontFamily: "inherit",
              }}
            >
              {template}
            </pre>
          </div>
        </div>

      </div>
    </div>
  )
}
