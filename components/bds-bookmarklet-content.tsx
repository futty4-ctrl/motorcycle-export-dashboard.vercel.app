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
} from "@/components/ui-system"

const APP_URL = "https://motorcycle-export-dashboard.vercel.app"

// Bookmarklet: prompts for bid amount, opens /bds-border?bid=XXXX in motoexport app
const BOOKMARKLET_CODE = `javascript:(function(){var b=prompt('BDS 現在入札額を入力 (例: 85000)');if(b){var n=b.replace(/[,，¥￥\\s]/g,'');if(isNaN(Number(n))||!n){alert('数字で入力してください');return;}window.open('${APP_URL}/bds-border?bid='+encodeURIComponent(n),'_blank','width=900,height=700');}})();`

export function BdsBookmarkletContent() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={pageWrapper}>
      <div style={pageTitle}>BDSブックマークレット</div>
      <div style={pageSub}>BDSオークション画面からボーダー計算を即起動</div>

      {/* Step guide */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { step: "01", title: "ブックマークに登録", desc: "下のボタンをブックマークバーにドラッグ、またはコードをコピーして手動登録" },
          { step: "02", title: "BDS画面を開く", desc: "ブラウザでBDSオークションページを開き、気になる車両を表示" },
          { step: "03", title: "ブックマークをクリック", desc: "登録したブックマークをクリック。入札額の入力を求めるダイアログが表示される" },
          { step: "04", title: "ボーダー計算画面へ", desc: "入札額を入力するとMotoExportのボーダー計算画面が別タブで開き、自動入力される" },
        ].map(({ step, title, desc }) => (
          <div
            key={step}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: font,
                fontSize: 10,
                color: C.orange,
                letterSpacing: 3,
                marginBottom: 8,
              }}
            >
              STEP {step}
            </div>
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 8 }}>
              {title}
            </div>
            <div style={{ fontFamily: font, fontSize: 12, color: C.textSub, lineHeight: 1.7 }}>
              {desc}
            </div>
          </div>
        ))}
      </div>

      {/* Drag button */}
      <div style={card()}>
        <div style={{ fontFamily: font, fontSize: 12, color: C.textSub, marginBottom: 16 }}>
          ① ブックマークバーにドラッグして登録
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a
            href={BOOKMARKLET_CODE}
            draggable
            onClick={(e) => e.preventDefault()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: C.orange,
              color: "#fff",
              borderRadius: 8,
              fontFamily: font,
              fontSize: 13,
              fontWeight: "bold",
              textDecoration: "none",
              cursor: "grab",
              userSelect: "none",
            }}
          >
            🎯 BDS ボーダー計算
          </a>
          <div style={{ fontFamily: font, fontSize: 11, color: C.textMuted }}>
            ← このボタンをブックマークバーにドラッグ
          </div>
        </div>
      </div>

      {/* Manual copy */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: font, fontSize: 12, color: C.textSub }}>
            ② または下のコードをコピーして手動でブックマーク登録
          </div>
          <button
            onClick={handleCopy}
            style={{
              padding: "8px 16px",
              background: copied ? C.green : `${C.orange}20`,
              border: `1px solid ${copied ? C.green : C.orange}40`,
              borderRadius: 6,
              color: copied ? C.green : C.orange,
              fontFamily: font,
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? "✓ コピー完了" : "コードをコピー"}
          </button>
        </div>
        <pre
          style={{
            fontFamily: font,
            fontSize: 10,
            color: C.textMuted,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            background: "#0a0a0b",
            padding: 14,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {BOOKMARKLET_CODE}
        </pre>

        <div
          style={{
            marginTop: 12,
            fontFamily: font,
            fontSize: 11,
            color: C.textMuted,
            lineHeight: 1.8,
          }}
        >
          手動登録手順: ブックマークバーで右クリック → 「ページを追加」→ 名前を入力（例: BDSボーダー）→ URLの欄に上のコードをペースト → 保存
        </div>
      </div>

      {/* Info */}
      <div
        style={{
          marginTop: 8,
          padding: "14px 18px",
          background: `${C.blue}10`,
          border: `1px solid ${C.blue}25`,
          borderRadius: 8,
          fontFamily: font,
          fontSize: 12,
          color: C.textSub,
          lineHeight: 1.8,
        }}
      >
        <div style={{ color: C.blue, fontWeight: "bold", marginBottom: 6 }}>動作について</div>
        クリック後に入札額の入力ダイアログが表示されます。金額を入力するとMotoExportのボーダー計算画面が別タブで開き、入札額が自動入力された状態になります。<br />
        会場・排気量・会員種別は引き続き手動で設定してください。
      </div>
    </div>
  )
}
