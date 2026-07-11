// LINE WORKS コマンド解釈（ふっちー側・安全装置つき）
// 仕様書 §6。誤爆防止のため「解釈」と「実行」を分離：ここは解釈のみ。
// 「直近pendingへの適用」「pending複数時のガード」は実行側(DB状態を持つハンドラ)で行う。

export type ParsedCommand =
  | { kind: "forward"; text: string }
  | { kind: "complete"; caseNo: string | null; amount: number | null }
  | { kind: "hold"; caseNo: string | null }
  | { kind: "confirm" }
  | { kind: "decline"; caseNo: string | null }
  | { kind: "quote"; caseNo: string | null; amount: number }
  | { kind: "unknown"; raw: string }

const toInt = (s: string): number => Number(s.replace(/,/g, ""))

/** ふっちーのLW入力を構造化コマンドに解釈する（副作用なし） */
export function parseLwCommand(input: string): ParsedCommand {
  const raw = input
  const t = input.trim()
  if (t === "") return { kind: "unknown", raw }

  // 「> テキスト」= 客へそのまま転送
  if (t.startsWith(">")) {
    return { kind: "forward", text: t.slice(1).trim() }
  }

  // 先頭の案件ID（B012 等）を任意で剥がす
  let caseNo: string | null = null
  let rest = t
  const cm = t.match(/^(B\d+)\s+(.*)$/i)
  if (cm) {
    caseNo = cm[1].toUpperCase()
    rest = cm[2].trim()
  }

  // 完了 [金額]
  const done = rest.match(/^完了(?:\s+([\d,]+))?$/)
  if (done) {
    return { kind: "complete", caseNo, amount: done[1] ? toInt(done[1]) : null }
  }
  // 保留
  if (rest === "保留") return { kind: "hold", caseNo }
  // OK（復唱確定）
  if (/^ok$/i.test(rest)) return { kind: "confirm" }
  // NG（お断り）
  if (/^ng$/i.test(rest)) return { kind: "decline", caseNo }
  // 金額のみ = 査定
  if (/^[\d,]+$/.test(rest)) {
    return { kind: "quote", caseNo, amount: toInt(rest) }
  }

  return { kind: "unknown", raw }
}

export interface AmountCheck {
  amount: number
  warn: boolean
  reason?: string
}

/** 金額バリデーション（§6-3）。¥1,000未満 / ¥150,000超は警告（ブロックはしない） */
export function checkAmount(amount: number): AmountCheck {
  if (!Number.isFinite(amount) || amount < 0) return { amount, warn: true, reason: "金額が不正" }
  if (amount < 1000) return { amount, warn: true, reason: "¥1,000未満" }
  if (amount > 150000) return { amount, warn: true, reason: "¥150,000超（仕入15万キャップ）" }
  return { amount, warn: false }
}
