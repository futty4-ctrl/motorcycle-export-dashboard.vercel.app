"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

const C = {
  surface: "#111111",
  border: "#2a2a2a",
  orange: "#f97316",
  orangeGlow: "rgba(249,115,22,0.12)",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const NAV = [
  {
    group: "メイン",
    items: [
      { href: "/", label: "ダッシュボード", icon: "◈" },
      { href: "/inventory", label: "在庫管理", icon: "▦" },
    ],
  },
  {
    group: "仕入れ判断",
    items: [
      { href: "/bidding", label: "入札判断", icon: "⚡" },
      { href: "/auction-day", label: "オークション当日", icon: "🏁" },
      { href: "/bidding-analytics", label: "振り返り分析", icon: "📊" },
    ],
  },
  {
    group: "分析",
    items: [
      { href: "/market", label: "市場価格", icon: "▲" },
      { href: "/scoreboard", label: "利益スコアボード", icon: "🏆" },
      { href: "/performance", label: "売却実績", icon: "📉" },
      { href: "/recommendation", label: "仕入れ推薦", icon: "🎯" },
      { href: "/check", label: "仕入れチェック", icon: "✅" },
      { href: "/profit-forecast", label: "在庫×期待利益", icon: "📊" },
      { href: "/monthly-progress", label: "月次進捗", icon: "📈" },
      { href: "/cashflow", label: "資金繰りシミュ", icon: "💰" },
      { href: "/ebay-research", label: "eBayリサーチ", icon: "🌍" },
    ],
  },
  {
    group: "管理",
    items: [
      { href: "/yahoo-template", label: "出品テンプレ", icon: "📝" },
      { href: "/invoices", label: "請求書・見積書", icon: "🧾" },
      { href: "/kobutsu", label: "古物台帳", icon: "📋" },
      { href: "/documents", label: "ドキュメント", icon: "◻" },
      { href: "/settings", label: "設定", icon: "⚙" },
    ],
  },
  {
    group: "ヘルプ",
    items: [
      { href: "/manual", label: "使い方ガイド", icon: "📖" },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Close on navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setOpen(!open)}
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 60,
            width: 40,
            height: 40,
            borderRadius: 8,
            background: open ? C.orange : C.surface,
            border: `1px solid ${C.border}`,
            color: open ? "#000" : C.text,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="メニュー"
        >
          {open ? "✕" : "☰"}
        </button>
      )}

      {/* Overlay */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 39,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: isMobile && !open ? -260 : 0,
          bottom: 0,
          width: isMobile ? 260 : 220,
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 40,
          transition: "left 0.25s ease",
        }}
      >
        <div
          style={{
            padding: "24px 20px 20px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              fontFamily: C.fontSans,
              fontWeight: 800,
              fontSize: 16,
              color: C.text,
              letterSpacing: "-0.02em",
            }}
          >
            Moto<span style={{ color: C.orange }}>Export</span>
          </div>
          <div
            style={{
              fontFamily: C.font,
              fontSize: 9,
              color: C.textMuted,
              letterSpacing: "0.15em",
              marginTop: 3,
            }}
          >
            DASHBOARD v2
          </div>
        </div>

        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 0",
          }}
        >
          {NAV.map((group) => (
            <div key={group.group} style={{ marginBottom: 4 }}>
              <div
                style={{
                  padding: "8px 20px 4px",
                  fontFamily: C.font,
                  fontSize: 9,
                  color: C.textMuted,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {group.group}
              </div>
              {group.items.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 20px",
                      textDecoration: "none",
                      background: active ? C.orangeGlow : "none",
                      borderLeft: `2px solid ${
                        active ? C.orange : "transparent"
                      }`,
                      color: active ? C.orange : C.textSub,
                      fontFamily: C.fontSans,
                      fontSize: 13,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.04)"
                        e.currentTarget.style.color = C.text
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "none"
                        e.currentTarget.style.color = C.textSub
                      }
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        width: 16,
                        textAlign: "center",
                      }}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: C.orangeGlow,
                border: `1px solid ${C.orange}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: C.font,
                fontSize: 11,
                color: C.orange,
                fontWeight: "bold",
              }}
            >
              F
            </div>
            <div>
              <div
                style={{
                  fontFamily: C.fontSans,
                  fontSize: 12,
                  color: C.text,
                }}
              >
                ふっちー
              </div>
              <div
                style={{
                  fontFamily: C.font,
                  fontSize: 10,
                  color: C.textMuted,
                }}
              >
                JFP / GAMI
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
