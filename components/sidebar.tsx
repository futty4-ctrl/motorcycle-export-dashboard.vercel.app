"use client";

import { usePathname, useRouter } from "next/navigation";

const C = {
  bg: "#0a0a0b",
  surface: "#111113",
  border: "#1e1e22",
  orange: "#f5720a",
  text: "#e8e8ec",
  textMuted: "#6b6b74",
  textSub: "#9999a8",
};

const NAV = [
  {
    group: "MAIN",
    items: [
      { id: "/", label: "ダッシュボード", icon: "◈" },
      { id: "/bds-simulator", label: "BDS入札シミュ", icon: "⟆" },
      { id: "/market", label: "BDS過去相場", icon: "∿" },
    ],
  },
  {
    group: "BUSINESS",
    items: [
      { id: "/documents", label: "見積・請求", icon: "◻" },
      { id: "/auction-preview", label: "オークション・プレビュー", icon: "◫" },
      { id: "/inventory", label: "在庫管理", icon: "▦" },
    ],
  },
  {
    group: "ANALYTICS",
    items: [
      { id: "/analytics", label: "予想 vs 実績", icon: "△" },
      { id: "/ebay", label: "eBay出品", icon: "⌁" },
    ],
  },
  {
    group: "OTHER",
    items: [
      { id: "/manual", label: "取扱説明書", icon: "?" },
      { id: "/settings", label: "設定", icon: "⚙" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      style={{
        width: 220,
        background: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        fontFamily: "'JetBrains Mono','Courier New',monospace",
      }}
    >
      <div
        style={{
          padding: "20px 16px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: C.orange,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: 14,
            color: "#fff",
          }}
        >
          M
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: "bold",
            lineHeight: 1.3,
            color: C.text,
          }}
        >
          MotoExport
          <br />
          <span style={{ color: C.orange, fontSize: 11 }}>Pro</span>
        </div>
      </div>
      <nav style={{ padding: "8px 0", flex: 1 }}>
        {NAV.map((group) => (
          <div key={group.group}>
            <div
              style={{
                padding: "8px 12px 4px",
                fontSize: 10,
                color: C.textMuted,
                letterSpacing: 1.5,
              }}
            >
              {group.group}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => router.push(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontSize: 12,
                    color: active ? C.orange : C.textSub,
                    background: active ? `${C.orange}15` : "transparent",
                    borderRight: active
                      ? `2px solid ${C.orange}`
                      : "2px solid transparent",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${C.border}`,
          fontSize: 10,
          color: C.textMuted,
        }}
      >
        MotoExport Pro v1.0
        <br />
        合同会社JFP
      </div>
    </div>
  );
}
