"use client"

import dynamic from "next/dynamic"

const InvoiceEditor = dynamic(() => import("@/components/invoice-editor"), { ssr: false })

export default function InvoicesPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: 22,
              color: "#f5f5f5",
              letterSpacing: "-0.02em",
            }}
          >
            請求書 / 見積書
          </h1>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#525252",
              letterSpacing: "0.1em",
            }}
          >
            INVOICES
          </span>
        </div>
        <p
          style={{
            margin: "6px 0 0",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: "#a3a3a3",
          }}
        >
          請求書・見積書の作成・保存・印刷ができます。
        </p>
      </div>
      <InvoiceEditor />
    </div>
  )
}
