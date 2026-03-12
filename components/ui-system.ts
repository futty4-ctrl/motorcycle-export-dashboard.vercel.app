import type { CSSProperties } from "react"

// components/ui-system.ts
export const C = {
  bg: "#0a0a0b",
  surface: "#111113",
  surfaceHover: "#16161a",
  border: "#1e1e22",
  borderHover: "#2e2e34",
  orange: "#f5720a",
  orangeGlow: "rgba(245,114,10,0.15)",
  text: "#e8e8ec",
  textMuted: "#6b6b74",
  textSub: "#9999a8",
  green: "#22c55e",
  greenGlow: "rgba(34,197,94,0.15)",
  red: "#ef4444",
  redGlow: "rgba(239,68,68,0.15)",
  blue: "#3b82f6",
  blueGlow: "rgba(59,130,246,0.15)",
  yellow: "#eab308",
  yellowGlow: "rgba(234,179,8,0.15)",
}

export const font =
  "'JetBrains Mono','Fira Code','Courier New',monospace"

export const card = (glowColor?: string): CSSProperties => ({
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 24,
  marginBottom: 16,
  boxShadow: glowColor ? `0 0 20px ${glowColor}` : "none",
  transition: "box-shadow 0.2s, border-color 0.2s",
})

export const kpiCard = (color: string): CSSProperties => ({
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: 20,
  borderLeft: `3px solid ${color}`,
  boxShadow: `0 0 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
  position: "relative",
  overflow: "hidden",
})

export const lbl: CSSProperties = {
  fontSize: 10,
  color: C.textMuted,
  letterSpacing: 2,
  textTransform: "uppercase",
  marginBottom: 8,
}

export const inp: CSSProperties = {
  background: "#0a0a0b",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.text,
  padding: "9px 12px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: font,
  transition: "border-color 0.15s",
}

export const btn = (
  variant: "primary" | "ghost" | "danger" = "primary"
): CSSProperties => ({
  padding: "10px 20px",
  borderRadius: 6,
  border:
    variant === "ghost"
      ? `1px solid ${C.border}`
      : variant === "danger"
        ? `1px solid ${C.red}40`
        : "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: "bold",
  fontFamily: font,
  letterSpacing: 0.3,
  background:
    variant === "primary"
      ? C.orange
      : variant === "danger"
        ? `${C.red}15`
        : "transparent",
  color:
    variant === "primary" ? "#fff" : variant === "danger" ? C.red : C.textSub,
  transition: "opacity 0.15s, transform 0.1s",
})

export const badge = (color: string): CSSProperties => ({
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 4,
  fontSize: 11,
  background: `${color}18`,
  color,
  fontWeight: "bold",
  border: `1px solid ${color}30`,
  letterSpacing: 0.5,
})

export const pageWrapper: CSSProperties = {
  fontFamily: font,
  color: C.text,
  padding: "32px 40px",
  maxWidth: 960,
}

export const pageTitle: CSSProperties = {
  fontSize: 24,
  fontWeight: "bold",
  marginBottom: 4,
  letterSpacing: -0.5,
}

export const pageSub: CSSProperties = {
  fontSize: 12,
  color: C.textSub,
  marginBottom: 32,
}

export const divider: CSSProperties = {
  borderBottom: `1px solid ${C.border}`,
  margin: "20px 0",
}

export const grid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginBottom: 16,
}

export const grid3: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 16,
  marginBottom: 16,
}

export const grid4: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: 16,
  marginBottom: 16,
}

export const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
}

export const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 10,
  color: C.textMuted,
  borderBottom: `1px solid ${C.border}`,
  letterSpacing: 1.5,
  textTransform: "uppercase",
}

export const td: CSSProperties = {
  padding: "12px 12px",
  borderBottom: `1px solid ${C.border}40`,
  color: C.text,
}
