"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
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

/* ── 選択肢 ── */
const REASONS = [
  "乗り換えのため",
  "引っ越しで保管場所がなくなるため",
  "しばらく乗る機会��なくなったため",
  "体調の都合で乗れなくなったため",
  "諸事情により手放すことになりました",
] as const

const STORAGES = [
  "自宅ガレージ（屋内）",
  "屋根付き駐輪場",
  "屋外・カバーあり",
  "屋外保��",
] as const

const CHECKS = [
  "エンジン始動確認済み",
  "走行確認済み（自走可）",
  "自走不可（押し引き可）",
  "書類あり（名義変更可）",
  "廃車済み（譲渡証あり）",
  "ナ��バー付き",
  "オイル漏れなし",
  "灯火類すべて点灯確認済み",
  "前後ブレーキ効き確認済み",
  "キー・メインスイッチ正常",
  "セル始動OK",
  "キック始動OK",
  "タイヤ残溝あ���",
] as const

const ENGINE_PRESETS = [
  "一発始動、アイドリング安定しています。異音・白煙なし。",
  "始動確認済み。暖機後はアイドリング安定します。",
  "セル・キックともに始動OK。走行に問題ありません。",
  "長期不動のためエンジン未確認です。",
] as const

const EXTERIOR_PRESETS = [
  "年式相応の小傷・くすみはありますが、目立つ大きな傷やへこみはありません。",
  "全体的にきれいな状態です。細かい傷は写真でご確認ください。",
  "転倒歴あり。傷の箇所は写真に載せています。走行には支障ありません。",
  "サビ・傷が目立ちます。写真で必ずご確認ください。",
] as const

/* ── テンプレ生成 ── */
function buildTemplate(p: {
  maker: string; model: string; modelType: string
  year: string; cc: string; km: string
  reason: string; storage: string
  engineNote: string; exteriorNote: string
  extra: string; youtubeUrl: string
  checks: string[]
}) {
  const s = "━━━━━━━━━━━━━━━━━━━━\n"
  let t = ""

  // 冒頭（固定）
  t += "ご覧いただきありがとうございます。\n\n"
  t += `${p.reason}、出品いたします。\n`
  t += `${p.storage}で保管しておりました。\n`
  t += "状態は写真と動画でご確認ください。\n\n"

  // 車両スペック
  t += s + "■ 車両スペック\n" + s
  t += `メーカー　：${p.maker || "－"}\n`
  t += `車名　　　：${p.model || "－"}\n`
  t += `型式　　　：${p.modelType || "－"}\n`
  t += `年式　　　：${p.year || "－"}\n`
  t += `排気量　　：${p.cc ? p.cc + "cc" : "－"}\n`
  t += `走行距離　：${p.km ? Number(p.km.replace(/,/g, "")).toLocaleString() + "km" : "－"}\n\n`

  // 車両の状態
  t += s + "■ 車両の状態\n" + s
  t += "【エンジン・機関】\n"
  t += (p.engineNote || "始動確認済み。詳細は動画をご覧ください。") + "\n\n"
  t += "【外装】\n"
  t += (p.exteriorNote || "年式相応の使用感があります。写真でご確認ください。") + "\n\n"

  if (p.extra) {
    t += "【その他・カスタム】\n"
    t += p.extra + "\n\n"
  }

  // 確認済み項目
  if (p.checks.length > 0) {
    t += s + "■ 確認済み項目\n" + s
    p.checks.forEach((c) => { t += `  ${c}\n` })
    t += "\n"
  }

  // 動画（固定コピー＋URL）
  t += s + "■ 動画で実車を確認できます\n" + s
  t += "エンジン始動の様子や各部の状態を撮影しています。\n"
  t += "ぜひご確認の上、ご入札をご検討ください。\n"
  if (p.youtubeUrl) {
    t += `▶ <a href="${p.youtubeUrl}" target="_blank" rel="noopener">${p.youtubeUrl}</a>\n\n`
  } else {
    t += "※ 動画準備中\n\n"
  }

  // 取引条件（固定）
  t += s + "■ お取引について\n" + s
  t += "・1円スタートです\n"
  t += "・大阪府守口市からの出品です\n"
  t += "・引き渡し：現地引き取り、または陸送手配（落札者様にてお願いいたします）\n"
  t += "・落札後48時間以内のご連絡をお願いいたします\n"
  t += "・お支払い確認後、速やかにお引き渡しの段取りをいたします\n"
  t += "・名義変更は落札者様にてお願いいたします\n\n"

  // 注意事項（固定・5大免責文）
  t += s + "■ ご入札前に必ずお読みください\n" + s
  t += "・素人の判断ですので、見落としている箇所がある可能性があります\n"
  t += "・中古車にご理解のある方のみ、ご入札をお願いいたします\n"
  t += "・神経質な方はご入札をお控えください\n"
  t += "・現車確認も歓迎です。ご希望の方は入札前にご連絡ください\n"
  t += "・ノークレーム・ノーリターンでお願いいたします\n\n"

  // 締め（固定）
  t += "写真・動画をよくご確認の上、\n"
  t += "ご不明な点があればお気軽にご質問ください。\n"
  t += "気持ちの良いお取引ができるよう、誠実に対応いたします。\n"
  t += "よろしくお願いいたします。\n"

  return t
}

/* ── タイトル生成 ── */
function buildTitle(p: {
  maker: string; model: string; year: string; cc: string; km: string
  hasVideo: boolean; checks: string[]
}) {
  const parts: string[] = []
  if (p.year) parts.push(p.year)
  if (p.maker) parts.push(p.maker)
  if (p.model) parts.push(p.model)
  if (p.cc) parts.push(p.cc + "cc")
  if (p.km) parts.push("走行" + Number(p.km.replace(/,/g, "")).toLocaleString() + "km")

  const tags: string[] = []
  if (p.checks.includes("エンジン始動確認済み")) tags.push("始動確認済")
  if (p.hasVideo) tags.push("動画あり")
  if (p.checks.includes("走行確認済み（自走可）")) tags.push("自走OK")

  const title = parts.join(" ")
  const tagStr = tags.length > 0 ? " " + tags.join("/") : ""
  return title + tagStr
}

/* ── スタイル ── */
const sectionCard = {
  background: "#111113",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: 20,
  marginBottom: 12,
} as const

const sectionTitle = (text: string, sub?: string) => (
  <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
    {text}
    {sub && <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 400 }}>{sub}</span>}
  </div>
)

const presetBtn = (active: boolean) => ({
  padding: "6px 12px",
  borderRadius: 6,
  border: `1px solid ${active ? C.orange : C.border}`,
  background: active ? `${C.orange}15` : "transparent",
  color: active ? C.orange : C.textSub,
  cursor: "pointer" as const,
  fontSize: 12,
  fontFamily: font,
  textAlign: "left" as const,
  lineHeight: 1.5,
})

const checkBox = (checked: boolean) => ({
  display: "flex",
  alignItems: "center" as const,
  gap: 8,
  padding: "7px 10px",
  background: checked ? `${C.orange}08` : "#0a0a0b",
  border: `1px solid ${checked ? C.orange + "40" : C.border}`,
  borderRadius: 6,
  cursor: "pointer" as const,
})

/* ── コンポーネント ── */
export function YahooTemplateContent() {
  const searchParams = useSearchParams()

  // 車両情報（在庫ページから引き継ぎ可能）
  const [maker, setMaker] = useState("")
  const [model, setModel] = useState("")
  const [modelType, setModelType] = useState("")
  const [year, setYear] = useState("")
  const [cc, setCc] = useState("")
  const [km, setKm] = useState("")

  // 選択式
  const [reason, setReason] = useState<string>(REASONS[0])
  const [storage, setStorage] = useState<string>(STORAGES[0])

  // 状態（プリセット＋自由記述）
  const [engineNote, setEngineNote] = useState(ENGINE_PRESETS[0])
  const [exteriorNote, setExteriorNote] = useState(EXTERIOR_PRESETS[0])
  const [extra, setExtra] = useState("")

  // チェック
  const [checks, setChecks] = useState<Record<string, boolean>>({
    "エンジン始動確認済み": true,
    "走行確認済み（自走可）": true,
    "書類あり（名義変更可）": true,
    "キー・メインスイッチ正常": true,
  })

  // YouTube
  const [youtubeUrl, setYoutubeUrl] = useState("")

  // コピー
  const [copiedBody, setCopiedBody] = useState(false)
  const [copiedTitle, setCopiedTitle] = useState(false)

  // URLパラメータから在庫データ読み込み
  useEffect(() => {
    const m = searchParams.get("maker")
    const n = searchParams.get("model")
    const t = searchParams.get("type")
    if (m) setMaker(m)
    if (n) setModel(n)
    if (t) setModelType(t)
  }, [searchParams])

  const toggleCheck = (item: string) => {
    setChecks((prev) => ({ ...prev, [item]: !prev[item] }))
  }

  const checkedItems = CHECKS.filter((c) => checks[c])

  const template = buildTemplate({
    maker, model, modelType, year, cc, km,
    reason, storage, engineNote, exteriorNote, extra, youtubeUrl,
    checks: checkedItems,
  })

  const title = buildTitle({
    maker, model, year, cc, km,
    hasVideo: !!youtubeUrl,
    checks: checkedItems,
  })

  const handleCopyBody = () => {
    navigator.clipboard.writeText(template).then(() => {
      setCopiedBody(true)
      setTimeout(() => setCopiedBody(false), 2000)
    })
  }

  const handleCopyAndOpenYahoo = async () => {
    // タイトル＋本文を合わせてクリップボードへ
    const combined = `【タイトル】\n${title}\n\n【出品文】\n${template}`
    await navigator.clipboard.writeText(combined)
    setCopiedBody(true)
    setCopiedTitle(true)
    setTimeout(() => {
      setCopiedBody(false)
      setCopiedTitle(false)
    }, 2000)
    window.open("https://auctions.yahoo.co.jp/sell/jp/show/submit?category=2084024278", "_blank", "noopener,noreferrer")
  }

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(title).then(() => {
      setCopiedTitle(true)
      setTimeout(() => setCopiedTitle(false), 2000)
    })
  }

  return (
    <div style={{ ...pageWrapper, maxWidth: 1300 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          ...pageTitle,
          background: `linear-gradient(135deg, ${C.text} 60%, ${C.orange})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          出品テンプレート
        </div>
        <div style={pageSub}>
          個人出品風 · 1円スタート · 大阪府守口市 · 動画必須
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16 }}>

        {/* ── LEFT: フォーム ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {/* 車両情報 */}
          <div style={sectionCard}>
            {sectionTitle("車両スペック", "在庫から自動入力 or 手入力")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "メーカー", ph: "ホンダ", val: maker, set: setMaker },
                { label: "車名", ph: "スーパーカブ110", val: model, set: setModel },
                { label: "型式", ph: "JA10", val: modelType, set: setModelType },
                { label: "年式", ph: "2015年式", val: year, set: setYear },
                { label: "排気量", ph: "110", val: cc, set: setCc },
                { label: "走行距離(km)", ph: "12000", val: km, set: setKm },
              ].map(({ label, ph, val, set }) => (
                <div key={label}>
                  <label style={{ ...lbl, marginBottom: 3, fontSize: 9 }}>{label}</label>
                  <input style={{ ...inp, padding: "7px 10px", fontSize: 13 }}
                    placeholder={ph} value={val} onChange={(e) => set(e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* 出品理由・保管 */}
          <div style={sectionCard}>
            {sectionTitle("出品背景", "個人感を出す重要ポイント")}
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...lbl, marginBottom: 6, fontSize: 9 }}>出品理由</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {REASONS.map((r) => (
                  <button key={r} onClick={() => setReason(r)} style={presetBtn(reason === r)}>{r}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 6, fontSize: 9 }}>保管方法</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STORAGES.map((s) => (
                  <button key={s} onClick={() => setStorage(s)} style={presetBtn(storage === s)}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* エンジン状態 */}
          <div style={sectionCard}>
            {sectionTitle("エンジン・機関の状態")}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              {ENGINE_PRESETS.map((p) => (
                <button key={p} onClick={() => setEngineNote(p)} style={presetBtn(engineNote === p)}>{p}</button>
              ))}
            </div>
            <textarea
              style={{ ...inp, minHeight: 56, resize: "vertical", lineHeight: 1.6, fontSize: 13 }}
              value={engineNote} onChange={(e) => setEngineNote(e.target.value)}
              placeholder="自由に編集OK" />
          </div>

          {/* 外装状態 */}
          <div style={sectionCard}>
            {sectionTitle("外装の状態")}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              {EXTERIOR_PRESETS.map((p) => (
                <button key={p} onClick={() => setExteriorNote(p)} style={presetBtn(exteriorNote === p)}>{p}</button>
              ))}
            </div>
            <textarea
              style={{ ...inp, minHeight: 56, resize: "vertical", lineHeight: 1.6, fontSize: 13 }}
              value={exteriorNote} onChange={(e) => setExteriorNote(e.target.value)}
              placeholder="自由に編集OK" />
          </div>

          {/* 確認チェック */}
          <div style={sectionCard}>
            {sectionTitle("動作確認チェック", "該当するものだけONに")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {CHECKS.map((item) => {
                const checked = !!checks[item]
                return (
                  <div key={item} onClick={() => toggleCheck(item)} style={checkBox(checked)}>
                    <input type="checkbox" checked={checked} onChange={() => {}}
                      style={{ accentColor: C.orange, width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: checked ? C.text : C.textMuted, cursor: "pointer" }}>{item}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* YouTube */}
          <div style={{ ...sectionCard, borderColor: C.orange + "60" }}>
            {sectionTitle("YouTube動画URL", "★ 必須 — 落札額に直結")}
            <input
              style={{ ...inp, borderColor: C.orange + "40", fontSize: 14 }}
              placeholder="https://youtu.be/xxxxxxxxxxxx"
              value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.6 }}>
              不動車でも必ず撮影してください。エンジン始動→アイドリング→外装グルっと→灯火類の順がベスト。
            </div>
          </div>

          {/* カス��ム・特記 */}
          <div style={sectionCard}>
            {sectionTitle("その他・カスタム・特記事項", "任意")}
            <textarea
              style={{ ...inp, minHeight: 64, resize: "vertical", lineHeight: 1.6, fontSize: 13 }}
              value={extra} onChange={(e) => setExtra(e.target.value)}
              placeholder="例：社外マフラーに交換済み。純正マフラーも付属します。" />
          </div>
        </div>

        {/* ── RIGHT: プレビュー（sticky） ── */}
        <div style={{ position: "sticky", top: 12, alignSelf: "start" }}>

          {/* タイトル */}
          <div style={{ ...sectionCard, borderColor: C.orange + "40" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.orange, fontWeight: 700 }}>出品タイトル</span>
              <button onClick={handleCopyTitle}
                style={{ ...btn("ghost"), padding: "4px 12px", fontSize: 11, background: copiedTitle ? `${C.green}20` : "transparent", color: copiedTitle ? C.green : C.textSub }}>
                {copiedTitle ? "コピー済" : "コピー"}
              </button>
            </div>
            <div style={{
              background: "#0a0a0b", border: `1px solid ${C.border}`, borderRadius: 6,
              padding: "10px 14px", fontSize: 14, fontWeight: 700, color: C.text,
              lineHeight: 1.5, wordBreak: "break-all",
            }}>
              {title || "車両情報を入力するとタイトルが生成されます"}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4, textAlign: "right" }}>
              {title.length}/65文字
            </div>
          </div>

          {/* 本文プレビュー */}
          <div style={sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: C.orange, fontWeight: 700 }}>出品文プレビュー</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleCopyBody}
                  style={{
                    padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 700, fontFamily: font,
                    background: copiedBody ? C.green : C.orange,
                    color: "#fff", transition: "background 0.2s",
                  }}>
                  {copiedBody ? "コピー完了" : "出品文をコピー"}
                </button>
                <button onClick={handleCopyAndOpenYahoo}
                  style={{
                    padding: "8px 20px", borderRadius: 6, border: `1px solid ${C.green}`, cursor: "pointer",
                    fontSize: 13, fontWeight: 700, fontFamily: font,
                    background: `${C.green}15`, color: C.green, transition: "background 0.2s",
                  }}>
                  コピー＆ヤフオク出品 →
                </button>
              </div>
            </div>
            <pre style={{
              background: "#0a0a0b", border: `1px solid ${C.border}`, borderRadius: 6,
              padding: 16, fontSize: 12.5, lineHeight: 1.9, whiteSpace: "pre-wrap",
              wordBreak: "break-word", color: C.text, maxHeight: "70vh", overflowY: "auto",
              margin: 0, fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif",
            }}>
              {template}
            </pre>
          </div>

          {/* 固��部分の説明 */}
          <div style={{ padding: "12px 16px", background: `${C.yellow}08`, border: `1px solid ${C.yellow}20`, borderRadius: 8, fontSize: 11, color: C.textMuted, lineHeight: 1.7 }}>
            <span style={{ color: C.yellow, fontWeight: 700 }}>固定コピー：</span>
            取引条件（1円スタート/堺市/引き取り or 陸送）と注意事項（5大免責文）は固定です。
            業者ワードは一切入っていません。
          </div>
        </div>
      </div>
    </div>
  )
}
