import Link from "next/link"

/**
 * 旧版ページに表示する非推奨バナー。新機能への誘導リンクを表示する。
 */
export function DeprecatedBanner({
  newPageHref,
  newPageLabel,
  reason,
}: {
  newPageHref: string
  newPageLabel: string
  reason?: string
}) {
  return (
    <div
      style={{
        background: "rgba(234,179,8,0.08)",
        border: "1px solid #eab308",
        borderRadius: 8,
        padding: "12px 16px",
        margin: "12px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            color: "#eab308",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          ⚠ 旧版ページ
        </div>
        <div style={{ fontSize: 13, color: "#a3a3a3" }}>
          {reason ?? "新しい機能に統合されました。"}
        </div>
      </div>
      <Link
        href={newPageHref}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          background: "#eab308",
          color: "#000",
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          letterSpacing: "0.05em",
          whiteSpace: "nowrap",
        }}
      >
        {newPageLabel} →
      </Link>
    </div>
  )
}
