"use client"

import { useState, useEffect } from "react"
import { getSettings, updateSettings } from "@/app/actions/settings"

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  borderLight: "#333333",
  orange: "#f97316",
  orangeDim: "#7c3a10",
  orangeGlow: "rgba(249,115,22,0.12)",
  green: "#22c55e",
  greenDim: "#14532d",
  red: "#ef4444",
  redDim: "#7f1d1d",
  yellow: "#eab308",
  blue: "#3b82f6",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: "18px 24px",
          borderBottom: `1px solid ${C.border}`,
          background: C.surfaceHigh,
        }}
      >
        <div
          style={{
            fontFamily: C.fontSans,
            fontWeight: 700,
            fontSize: 14,
            color: C.text,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: C.fontSans,
              fontSize: 12,
              color: C.textSub,
              marginTop: 3,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  )
}

function FieldRow({
  label,
  sublabel,
  children,
}: {
  label: string
  sublabel?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 24,
        paddingBottom: 20,
        marginBottom: 20,
        borderBottom: `1px solid ${C.border}22`,
        alignItems: "start",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: C.fontSans,
            fontSize: 13,
            fontWeight: 500,
            color: C.text,
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            style={{
              fontFamily: C.fontSans,
              fontSize: 11,
              color: C.textMuted,
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: C.surfaceHigh,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "10px 14px",
        color: C.text,
        fontFamily: mono ? C.font : C.fontSans,
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = C.orange)}
      onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
    />
  )
}

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          position: "relative",
          width: 44,
          height: 24,
          background: value ? C.orange : C.surfaceHigh,
          border: `1px solid ${value ? C.orange : C.border}`,
          borderRadius: 12,
          cursor: "pointer",
          padding: 0,
          transition: "all 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 22 : 2,
            width: 18,
            height: 18,
            background: "#fff",
            borderRadius: "50%",
            transition: "left 0.2s",
          }}
        />
      </button>
      <span
        style={{
          fontFamily: C.fontSans,
          fontSize: 13,
          color: C.textSub,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: C.surfaceHigh,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: "10px 14px",
        color: C.text,
        fontFamily: C.fontSans,
        fontSize: 13,
        outline: "none",
        width: "100%",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SaveButton({
  onClick,
  saved,
}: {
  onClick: () => void
  saved: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        transition: "all 0.25s",
      }}
    >
      {saved ? "✓ 保存済み" : "変更を保存"}
    </button>
  )
}

const TABS = [
  { id: "profile", label: "プロフィール" },
  { id: "api", label: "API設定" },
  { id: "auction", label: "オークション" },
  { id: "notify", label: "通知" },
  { id: "export", label: "エクスポート" },
  { id: "danger", label: "危険な操作" },
]

export function SettingsForm() {
  const [tab, setTab] = useState("profile")
  const [saved, setSaved] = useState(false)

  // Profile
  const [userName, setUserName] = useState("ふっちー")
  const [company, setCompany] = useState("合同会社JFP / 株式会社GAMI")
  const [email, setEmail] = useState("info@gami.jp")
  const [timezone, setTimezone] = useState("Asia/Tokyo")
  const [currency, setCurrency] = useState("JPY")
  // API
  const [geminiKey, setGeminiKey] = useState("")
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash")
  const [openaiKey, setOpenaiKey] = useState("")
  const [sheetId, setSheetId] = useState("")
  // Auction
  const [marginRate, setMarginRate] = useState("18")
  const [repairBuf, setRepairBuf] = useState("15000")
  const [yahooFee, setYahooFee] = useState("10")
  const [exportFee, setExportFee] = useState("8")
  const [defaultCond, setDefaultCond] = useState("B")
  // Notify
  const [notifyLine, setNotifyLine] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [notifyNew, setNotifyNew] = useState(true)
  const [notifyBid, setNotifyBid] = useState(true)
  const [notifySold, setNotifySold] = useState(true)
  const [lineToken, setLineToken] = useState("")
  // Export
  const [exportFmt, setExportFmt] = useState("csv")
  const [exportEnc, setExportEnc] = useState("utf8-bom")
  const [autoSync, setAutoSync] = useState(true)
  const [syncInterval, setSyncInterval] = useState("30")

  useEffect(() => {
    getSettings().then((s) => {
      setMarginRate(String(s.marginRatePct))
      setRepairBuf(String(s.repairBufferJpy))
      setYahooFee(String(s.yahooFeePct))
      setExportFee(String(s.exportFeePct))
    })
  }, [])

  const handleSave = async () => {
    if (tab === "auction") {
      await updateSettings({
        marginRatePct: Number(marginRate),
        repairBufferJpy: Number(repairBuf),
        yahooFeePct: Number(yahooFee),
        exportFeePct: Number(exportFee),
      })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ fontFamily: C.font, color: C.text }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: C.fontSans,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.02em",
            }}
          >
            設定
          </h1>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: "0.1em",
            }}
          >
            SETTINGS
          </span>
        </div>
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: C.fontSans,
            fontSize: 13,
            color: C.textSub,
          }}
        >
          システム設定・API接続・通知を管理します。
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            overflow: "hidden",
            position: "sticky",
            top: 20,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: "block",
                width: "100%",
                padding: "12px 18px",
                textAlign: "left",
                background: tab === t.id ? C.orangeGlow : "none",
                border: "none",
                borderLeft: `3px solid ${tab === t.id ? C.orange : "transparent"}`,
                color: tab === t.id ? C.orange : C.textSub,
                fontFamily: C.fontSans,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          {tab === "profile" && (
            <>
              <SectionCard
                title="基本情報"
                subtitle="表示名・会社名などを設定します"
              >
                <FieldRow
                  label="表示名"
                  sublabel="ダッシュボード上部に表示されます"
                >
                  <TextInput
                    value={userName}
                    onChange={setUserName}
                    placeholder="ふっちー"
                  />
                </FieldRow>
                <FieldRow
                  label="会社名"
                  sublabel="書類・レポートに使用されます"
                >
                  <TextInput
                    value={company}
                    onChange={setCompany}
                    placeholder="株式会社〇〇"
                  />
                </FieldRow>
                <FieldRow
                  label="メールアドレス"
                  sublabel="通知の送信先に使います"
                >
                  <TextInput
                    value={email}
                    onChange={setEmail}
                    type="email"
                    placeholder="you@example.com"
                  />
                </FieldRow>
                <FieldRow label="タイムゾーン">
                  <SelectInput
                    value={timezone}
                    onChange={setTimezone}
                    options={[
                      {
                        label: "Asia/Tokyo (JST +9:00)",
                        value: "Asia/Tokyo",
                      },
                      { label: "UTC +0:00", value: "UTC" },
                      {
                        label: "America/New_York (EST)",
                        value: "America/New_York",
                      },
                    ]}
                  />
                </FieldRow>
                <FieldRow label="表示通貨">
                  <SelectInput
                    value={currency}
                    onChange={setCurrency}
                    options={[
                      { label: "¥ 日本円 (JPY)", value: "JPY" },
                      { label: "$ 米ドル (USD)", value: "USD" },
                      { label: "€ ユーロ (EUR)", value: "EUR" },
                    ]}
                  />
                </FieldRow>
              </SectionCard>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <SaveButton onClick={handleSave} saved={saved} />
              </div>
            </>
          )}

          {tab === "api" && (
            <>
              <SectionCard
                title="Gemini API"
                subtitle="バイク査定・価格分析に使用するAIモデル"
              >
                <FieldRow
                  label="APIキー"
                  sublabel="Google AI Studio から取得"
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={geminiKey}
                      onChange={setGeminiKey}
                      type="password"
                      mono
                      placeholder="AIzaSy..."
                    />
                    <button
                      type="button"
                      style={{
                        padding: "10px 16px",
                        background: C.surfaceHigh,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.textSub,
                        fontFamily: C.fontSans,
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      接続確認
                    </button>
                  </div>
                </FieldRow>
                <FieldRow
                  label="モデル"
                  sublabel="画像解析はFlashまたはProを推奨"
                >
                  <SelectInput
                    value={geminiModel}
                    onChange={setGeminiModel}
                    options={[
                      {
                        label: "gemini-2.0-flash (推奨)",
                        value: "gemini-2.0-flash",
                      },
                      { label: "gemini-2.0-pro", value: "gemini-2.0-pro" },
                      {
                        label: "gemini-1.5-flash",
                        value: "gemini-1.5-flash",
                      },
                    ]}
                  />
                </FieldRow>
              </SectionCard>
              <SectionCard
                title="OpenAI API"
                subtitle="補助的なテキスト生成に使用（任意）"
              >
                <FieldRow
                  label="APIキー"
                  sublabel="OpenAI Platform から取得"
                >
                  <TextInput
                    value={openaiKey}
                    onChange={setOpenaiKey}
                    type="password"
                    mono
                    placeholder="sk-..."
                  />
                </FieldRow>
              </SectionCard>
              <SectionCard
                title="Google Sheets 連携"
                subtitle="相場マスター・在庫データの同期"
              >
                <FieldRow
                  label="スプレッドシートID"
                  sublabel="URLの /d/〈ここ〉/edit 部分"
                >
                  <TextInput
                    value={sheetId}
                    onChange={setSheetId}
                    mono
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  />
                </FieldRow>
              </SectionCard>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <SaveButton onClick={handleSave} saved={saved} />
              </div>
            </>
          )}

          {tab === "auction" && (
            <>
              <SectionCard
                title="査定デフォルト値"
                subtitle="入札上限算出のマージン・手数料・想定整備費など"
              >
                <FieldRow
                  label="利益マージン率（%）"
                  sublabel="想定売上に対する目標利益率"
                >
                  <TextInput
                    value={marginRate}
                    onChange={setMarginRate}
                    type="number"
                    mono
                    placeholder="18"
                  />
                </FieldRow>
                <FieldRow
                  label="想定整備バッファ（円）"
                  sublabel="修理・パーツ代の予備費"
                >
                  <TextInput
                    value={repairBuf}
                    onChange={setRepairBuf}
                    type="number"
                    mono
                    placeholder="15000"
                  />
                </FieldRow>
                <FieldRow
                  label="ヤフオク手数料率（%）"
                  sublabel="落札額に対するシステム手数料"
                >
                  <TextInput
                    value={yahooFee}
                    onChange={setYahooFee}
                    type="number"
                    mono
                    placeholder="10"
                  />
                </FieldRow>
                <FieldRow
                  label="輸出諸経費率（%）"
                  sublabel="輸出時の諸費用を売上の何%で見込むか"
                >
                  <TextInput
                    value={exportFee}
                    onChange={setExportFee}
                    type="number"
                    mono
                    placeholder="8"
                  />
                </FieldRow>
                <FieldRow
                  label="デフォルトコンディション"
                  sublabel="査定時に未指定の場合のランク"
                >
                  <SelectInput
                    value={defaultCond}
                    onChange={setDefaultCond}
                    options={[
                      { label: "Aランク", value: "A" },
                      { label: "Bランク (推奨)", value: "B" },
                      { label: "Cランク", value: "C" },
                      { label: "Dランク", value: "D" },
                    ]}
                  />
                </FieldRow>
              </SectionCard>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <SaveButton onClick={handleSave} saved={saved} />
              </div>
            </>
          )}

          {tab === "notify" && (
            <>
              <SectionCard
                title="通知チャネル"
                subtitle="LINE・メールでの通知のオン/オフ"
              >
                <FieldRow label="LINE通知" sublabel="LINE Notify でプッシュ通知">
                  <Toggle value={notifyLine} onChange={setNotifyLine} label="LINE通知を有効にする" />
                </FieldRow>
                <FieldRow label="メール通知">
                  <Toggle value={notifyEmail} onChange={setNotifyEmail} label="メール通知を有効にする" />
                </FieldRow>
              </SectionCard>
              <SectionCard
                title="通知タイミング"
                subtitle="どのイベントで通知するか"
              >
                <FieldRow label="新規査定保存時">
                  <Toggle value={notifyNew} onChange={setNotifyNew} label="新規査定を保存したら通知" />
                </FieldRow>
                <FieldRow label="入札時">
                  <Toggle value={notifyBid} onChange={setNotifyBid} label="BDS入札時に通知" />
                </FieldRow>
                <FieldRow label="売約成立時">
                  <Toggle value={notifySold} onChange={setNotifySold} label="売約成立時に通知" />
                </FieldRow>
              </SectionCard>
              <SectionCard title="LINE Notify トークン" subtitle="LINEに通知を送るためのトークン">
                <FieldRow label="アクセストークン" sublabel="LINE Notify のマイページで発行">
                  <TextInput
                    value={lineToken}
                    onChange={setLineToken}
                    type="password"
                    mono
                    placeholder="xxxxxxxxxxxx"
                  />
                </FieldRow>
              </SectionCard>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <SaveButton onClick={handleSave} saved={saved} />
              </div>
            </>
          )}

          {tab === "export" && (
            <>
              <SectionCard
                title="エクスポート形式"
                subtitle="CSV・Excel などの書出し設定"
              >
                <FieldRow label="ファイル形式">
                  <SelectInput
                    value={exportFmt}
                    onChange={setExportFmt}
                    options={[
                      { label: "CSV", value: "csv" },
                      { label: "Excel (.xlsx)", value: "xlsx" },
                    ]}
                  />
                </FieldRow>
                <FieldRow label="文字コード" sublabel="Excelで文字化けしないよう BOM 付き推奨">
                  <SelectInput
                    value={exportEnc}
                    onChange={setExportEnc}
                    options={[
                      { label: "UTF-8 (BOM付き)", value: "utf8-bom" },
                      { label: "UTF-8", value: "utf8" },
                      { label: "Shift_JIS", value: "sjis" },
                    ]}
                  />
                </FieldRow>
              </SectionCard>
              <SectionCard
                title="自動同期"
                subtitle="Google Sheets との定期同期"
              >
                <FieldRow label="自動同期">
                  <Toggle value={autoSync} onChange={setAutoSync} label="有効にする" />
                </FieldRow>
                <FieldRow label="同期間隔（分）" sublabel="自動同期が有効な場合">
                  <SelectInput
                    value={syncInterval}
                    onChange={setSyncInterval}
                    options={[
                      { label: "15分", value: "15" },
                      { label: "30分", value: "30" },
                      { label: "60分", value: "60" },
                    ]}
                  />
                </FieldRow>
              </SectionCard>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <SaveButton onClick={handleSave} saved={saved} />
              </div>
            </>
          )}

          {tab === "danger" && (
            <>
              <SectionCard
                title="危険な操作"
                subtitle="データ削除・リセットは取り消せません"
              >
                <div
                  style={{
                    padding: "24px 0",
                    borderBottom: `1px solid ${C.border}22`,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontFamily: C.fontSans,
                      fontSize: 13,
                      color: C.textSub,
                      lineHeight: 1.7,
                    }}
                  >
                    キャッシュのクリアや、ローカルに保存した設定のリセットを行います。サーバー上のデータには影響しません。
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={{
                      padding: "10px 20px",
                      background: C.surfaceHigh,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      color: C.textSub,
                      fontFamily: C.fontSans,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    キャッシュをクリア
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: "10px 20px",
                      background: C.redDim,
                      border: `1px solid ${C.red}`,
                      borderRadius: 6,
                      color: C.red,
                      fontFamily: C.fontSans,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    設定を工場出荷状態に戻す
                  </button>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
