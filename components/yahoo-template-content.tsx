"use client"

import { useState } from "react"
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

const CONDITIONS = ["良好", "普通", "難あり", "ジャンク"] as const
const REGIONS = ["関東", "九州"] as const

function buildTemplate(params: {
  maker: string
  modelName: string
  modelType: string
  year: string
  mileage: string
  cc: string
  condition: string
  conditionDetail: string
  buyItNow: string
  venue: string
}) {
  const title = [params.maker, params.modelName, params.modelType]
    .filter(Boolean)
    .join(" ")
  const yearStr = params.year ? `${params.year}年式` : ""
  const mileageStr = params.mileage
    ? `走行距離: 約 ${Number(params.mileage).toLocaleString()} km`
    : ""
  const ccStr = params.cc ? `排気量: ${params.cc}cc` : ""
  const buyNowLine = params.buyItNow
    ? `即決価格: ¥${Number(params.buyItNow).toLocaleString()}`
    : ""

  return `【${title}】${yearStr} ${ccStr} ${mileageStr ? `/ ${mileageStr}` : ""}

━━━━━━━━━━━━━━━━━━━━━━
■ 商品情報
━━━━━━━━━━━━━━━━━━━━━━
メーカー　: ${params.maker || "—"}
車名　　　: ${params.modelName || "—"}
型式　　　: ${params.modelType || "—"}
年式　　　: ${yearStr || "—"}
排気量　　: ${ccStr || "—"}
走行距離　: ${mileageStr ? `約 ${Number(params.mileage).toLocaleString()} km` : "—"}

━━━━━━━━━━━━━━━━━━━━━━
■ 車両状態
━━━━━━━━━━━━━━━━━━━━━━
状態: ${params.condition}
${params.conditionDetail ? params.conditionDetail : "特記事項なし"}

━━━━━━━━━━━━━━━━━━━━━━
■ 取引について
━━━━━━━━━━━━━━━━━━━━━━
・1円スタート（ノークレーム・ノーリターンでお願いします）
${buyNowLine ? `・${buyNowLine}` : ""}
・落札後24時間以内にご連絡ください
・支払い確認後、速やかに発送手配いたします

━━━━━━━━━━━━━━━━━━━━━━
■ 発送について
━━━━━━━━━━━━━━━━━━━━━━
・陸送業者にて全国発送可能
・送料は落札者様負担
・出荷元: 大阪府堺市
・発送業者: 陸送（担当者よりご連絡）

━━━━━━━━━━━━━━━━━━━━━━
■ 備考
━━━━━━━━━━━━━━━━━━━━━━
BDS ${params.venue}会場仕入れ車両です。
ご不明点はお気軽にご質問ください。
よろしくお願いいたします。`
}

export function YahooTemplateContent() {
  const [maker, setMaker] = useState("")
  const [modelName, setModelName] = useState("")
  const [modelType, setModelType] = useState("")
  const [year, setYear] = useState("")
  const [mileage, setMileage] = useState("")
  const [cc, setCc] = useState("")
  const [condition, setCondition] = useState<string>(CONDITIONS[0])
  const [conditionDetail, setConditionDetail] = useState("")
  const [buyItNow, setBuyItNow] = useState("")
  const [venue, setVenue] = useState<string>(REGIONS[0])
  const [copied, setCopied] = useState(false)

  const template = buildTemplate({
    maker,
    modelName,
    modelType,
    year,
    mileage,
    cc,
    condition,
    conditionDetail,
    buyItNow,
    venue,
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(template).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const fieldStyle = { ...inp, marginBottom: 0 }
  const rowStyle = { marginBottom: 16 }

  return (
    <div style={pageWrapper}>
      <div style={pageTitle}>ヤフオク出品テンプレ生成</div>
      <div style={pageSub}>1円スタート / 7日間 / 広告100円×7日</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Input form */}
        <div>
          <div style={card()}>
            <div
              style={{
                fontFamily: font,
                fontSize: 11,
                color: C.orange,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                marginBottom: 20,
              }}
            >
              車両情報
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={lbl}>メーカー</div>
                <input
                  style={fieldStyle}
                  value={maker}
                  onChange={(e) => setMaker(e.target.value)}
                  placeholder="Honda"
                />
              </div>
              <div>
                <div style={lbl}>車名</div>
                <input
                  style={fieldStyle}
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="CB400SF"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={lbl}>型式</div>
                <input
                  style={fieldStyle}
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  placeholder="NC31"
                />
              </div>
              <div>
                <div style={lbl}>年式</div>
                <input
                  style={fieldStyle}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2010"
                  type="number"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={lbl}>排気量 (cc)</div>
                <input
                  style={fieldStyle}
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="400"
                  type="number"
                />
              </div>
              <div>
                <div style={lbl}>走行距離 (km)</div>
                <input
                  style={fieldStyle}
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="25000"
                  type="number"
                />
              </div>
            </div>

            <div style={rowStyle}>
              <div style={lbl}>状態</div>
              <div style={{ display: "flex", gap: 8 }}>
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCondition(c)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 6,
                      border: `1px solid ${condition === c ? C.orange : C.border}`,
                      background: condition === c ? `${C.orange}18` : "transparent",
                      color: condition === c ? C.orange : C.textSub,
                      fontFamily: font,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={rowStyle}>
              <div style={lbl}>状態詳細 (任意)</div>
              <textarea
                style={{
                  ...fieldStyle,
                  height: 80,
                  resize: "vertical" as const,
                  lineHeight: 1.6,
                }}
                value={conditionDetail}
                onChange={(e) => setConditionDetail(e.target.value)}
                placeholder="エンジン始動確認済。フロントフォーク小傷あり。..."
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={lbl}>即決価格 (円 / 任意)</div>
                <input
                  style={fieldStyle}
                  value={buyItNow}
                  onChange={(e) => setBuyItNow(e.target.value)}
                  placeholder="150000"
                  type="number"
                />
              </div>
              <div>
                <div style={lbl}>仕入れ会場</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {REGIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setVenue(r)}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 6,
                        border: `1px solid ${venue === r ? C.orange : C.border}`,
                        background: venue === r ? `${C.orange}18` : "transparent",
                        color: venue === r ? C.orange : C.textSub,
                        fontFamily: font,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview + copy */}
        <div>
          <div style={{ ...card(), position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: font,
                  fontSize: 11,
                  color: C.orange,
                  letterSpacing: 2,
                  textTransform: "uppercase" as const,
                }}
              >
                プレビュー
              </div>
              <button
                onClick={handleCopy}
                style={{
                  ...btn("primary"),
                  padding: "8px 18px",
                  fontSize: 12,
                  background: copied ? C.green : C.orange,
                }}
              >
                {copied ? "✓ コピー完了" : "クリップボードにコピー"}
              </button>
            </div>
            <pre
              style={{
                fontFamily: font,
                fontSize: 11,
                color: C.textSub,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.8,
                margin: 0,
                background: "#0a0a0b",
                padding: 16,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                maxHeight: 520,
                overflowY: "auto",
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
