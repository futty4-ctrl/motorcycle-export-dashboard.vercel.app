"use client"

import { useMemo } from "react"

const C = {
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  border: "#2a2a2a",
  orange: "#f97316",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

function parseInline(text: string) {
  const parts: (string | React.ReactNode)[] = []
  let rest = text
  while (rest.length > 0) {
    const bold = rest.match(/\*\*(.+?)\*\*/)
    const code = rest.match(/`([^`]+)`/)
    const link = rest.match(/\[([^\]]+)\]\((#[^)]+)\)/)
    const first = [bold?.index ?? -1, code?.index ?? -1, link?.index ?? -1]
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)[0]
    if (first == null) {
      parts.push(rest)
      break
    }
    if (first > 0) parts.push(rest.slice(0, first))
    if (bold && bold.index === first) {
      parts.push(<strong key={parts.length}>{bold[1]}</strong>)
      rest = rest.slice(bold.index + bold[0].length)
    } else if (code && code.index === first) {
      parts.push(
        <code
          key={parts.length}
          style={{
            background: C.surfaceHigh,
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {code[1]}
        </code>
      )
      rest = rest.slice(code.index + code[0].length)
    } else if (link && link.index === first) {
      parts.push(
        <a
          key={parts.length}
          href={link[2]}
          style={{ color: C.orange, textDecoration: "none" }}
        >
          {link[1]}
        </a>
      )
      rest = rest.slice(link.index + link[0].length)
    } else {
      rest = rest.slice(first)
    }
  }
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts
}

function slugify(text: string) {
  return text
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf-]/g, "")
    .toLowerCase()
}

export default function ManualContent({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const lines = content.split(/\r?\n/)
    const out: React.ReactNode[] = []
    let i = 0
    let key = 0

    while (i < lines.length) {
      const line = lines[i]
      const trimmed = line.trim()

      if (trimmed === "---") {
        out.push(
          <hr
            key={key++}
            style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "24px 0" }}
          />
        )
        i++
        continue
      }

      if (trimmed.startsWith("### ")) {
        const id = slugify(trimmed.slice(4))
        out.push(
          <h3
            key={key++}
            id={id}
            style={{
              fontFamily: C.fontSans,
              fontWeight: 700,
              fontSize: 15,
              color: C.text,
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            {parseInline(trimmed.slice(4))}
          </h3>
        )
        i++
        continue
      }

      if (trimmed.startsWith("## ")) {
        const id = slugify(trimmed.slice(3))
        out.push(
          <h2
            key={key++}
            id={id}
            style={{
              fontFamily: C.fontSans,
              fontWeight: 800,
              fontSize: 18,
              color: C.text,
              marginTop: 28,
              marginBottom: 12,
              paddingBottom: 6,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {parseInline(trimmed.slice(3))}
          </h2>
        )
        i++
        continue
      }

      if (trimmed.startsWith("# ")) {
        out.push(
          <h1
            key={key++}
            style={{
              fontFamily: C.fontSans,
              fontWeight: 800,
              fontSize: 22,
              color: C.text,
              marginBottom: 8,
            }}
          >
            {trimmed.slice(2)}
          </h1>
        )
        i++
        continue
      }

      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const rows: string[][] = []
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          const row = lines[i]
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim())
          rows.push(row)
          i++
        }
        if (rows.length >= 1) {
          const [head, ...body] = rows
          out.push(
            <div key={key++} style={{ overflowX: "auto", marginBottom: 16 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: C.font,
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    {head.map((cell, c) => (
                      <th
                        key={c}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          borderBottom: `2px solid ${C.border}`,
                          color: C.textMuted,
                          fontWeight: 600,
                        }}
                      >
                        {parseInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body
                    .filter((row) => row.some((c) => c.replace(/-/g, "").trim()))
                    .map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            style={{
                              padding: "10px 12px",
                              borderBottom: `1px solid ${C.border}`,
                              color: C.textSub,
                            }}
                          >
                            {parseInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        }
        continue
      }

      if (trimmed.startsWith("- ")) {
        const items: string[] = []
        while (i < lines.length && lines[i].trim().startsWith("- ")) {
          items.push(lines[i].trim().slice(2))
          i++
        }
        out.push(
          <ul
            key={key++}
            style={{
              margin: "8px 0 16px",
              paddingLeft: 20,
              fontFamily: C.fontSans,
              fontSize: 13,
              color: C.textSub,
              lineHeight: 1.7,
            }}
          >
            {items.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {parseInline(item)}
              </li>
            ))}
          </ul>
        )
        continue
      }

      if (/^\d+\.\s/.test(trimmed)) {
        const items: string[] = []
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\.\s/, ""))
          i++
        }
        out.push(
          <ol
            key={key++}
            style={{
              margin: "8px 0 16px",
              paddingLeft: 20,
              fontFamily: C.fontSans,
              fontSize: 13,
              color: C.textSub,
              lineHeight: 1.7,
            }}
          >
            {items.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {parseInline(item)}
              </li>
            ))}
          </ol>
        )
        continue
      }

      if (trimmed === "") {
        i++
        continue
      }

      out.push(
        <p
          key={key++}
          style={{
            fontFamily: C.fontSans,
            fontSize: 13,
            color: C.textSub,
            lineHeight: 1.7,
            marginBottom: 10,
          }}
        >
          {parseInline(trimmed)}
        </p>
      )
      i++
    }

    return out
  }, [content])

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
            使い方ガイド
          </h1>
          <span
            style={{
              fontFamily: C.font,
              fontSize: 11,
              color: C.textMuted,
              letterSpacing: "0.1em",
            }}
          >
            MANUAL
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
          各機能の操作手順と画面の説明です。
        </p>
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "28px 32px",
          maxWidth: 800,
          lineHeight: 1.6,
        }}
      >
        {blocks}
      </div>
    </div>
  )
}
