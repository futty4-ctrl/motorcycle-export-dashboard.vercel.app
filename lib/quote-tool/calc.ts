import type { QuoteLine, RoundingMode, RoundingUnit } from "./types"
import { TAX_RATE } from "./types"

function roundToUnit(value: number, unit: RoundingUnit, mode: RoundingMode): number {
  if (unit === 1) return Math.round(value)
  switch (mode) {
    case "floor":
      return Math.floor(value / unit) * unit
    case "ceil":
      return Math.ceil(value / unit) * unit
    case "round":
      return Math.round(value / unit) * unit
    default:
      return Math.round(value / unit) * unit
  }
}

function sumFixedAndUnit(lines: QuoteLine[]): number {
  return lines.reduce((sum, line) => {
    if (line.type === "fixed") return sum + line.amount
    if (line.type === "unit") return sum + line.quantity * line.unitPrice
    return sum
  }, 0)
}

export function applyTax(subtotal: number, taxRate: number): { subtotal: number; tax: number; total: number } {
  const tax = Math.round(subtotal * taxRate)
  return { subtotal, tax, total: subtotal + tax }
}

export function roundTotal(total: number, unit: RoundingUnit, mode: RoundingMode): number {
  return roundToUnit(total, unit, mode)
}

export function computeQuote(
  lines: QuoteLine[],
  options: {
    targetTotalInclTax: number | null
    autoDistribution: "equal" | "ratio"
    roundingUnit: RoundingUnit
    roundingMode: RoundingMode
    taxRate: number
  }
): { lines: QuoteLine[]; subtotal: number; tax: number; totalInclTax: number } {
  const fixedAndUnitTotal = sumFixedAndUnit(lines)
  const linesCopy = lines.map((l) => {
    const copy = { ...l }
    if (copy.type === "unit") copy.amount = copy.quantity * copy.unitPrice
    return copy
  })
  const autoLines = linesCopy.filter((l) => l.type === "auto")
  const adjustmentLine = linesCopy.find((l) => l.type === "adjustment")
  const hasTarget = options.targetTotalInclTax != null && options.targetTotalInclTax > 0

  let autoTotal = 0
  if (autoLines.length > 0 && hasTarget) {
    const targetIncl = roundTotal(options.targetTotalInclTax, options.roundingUnit, options.roundingMode)
    const targetExcl = Math.floor(targetIncl / (1 + options.taxRate))
    const remainder = targetExcl - fixedAndUnitTotal
    if (remainder > 0) {
      if (options.autoDistribution === "equal") {
        const perLine = Math.floor(remainder / autoLines.length)
        const remainderMod = remainder % autoLines.length
        autoLines.forEach((line, i) => {
          line.amount = perLine + (i < remainderMod ? 1 : 0)
        })
      } else {
        const totalRatio = autoLines.reduce((s, l) => s + (l.autoRatio ?? 1), 0)
        let assigned = 0
        autoLines.forEach((line, i) => {
          const ratio = (line.autoRatio ?? 1) / totalRatio
          const amt = i === autoLines.length - 1 ? remainder - assigned : Math.floor(remainder * ratio)
          line.amount = amt
          assigned += amt
        })
      }
      autoTotal = autoLines.reduce((s, l) => s + l.amount, 0)
    }
  } else {
    autoLines.forEach((l) => { l.amount = 0 })
  }

  let subtotal = fixedAndUnitTotal + autoTotal
  if (adjustmentLine && hasTarget) {
    const targetIncl = roundTotal(options.targetTotalInclTax, options.roundingUnit, options.roundingMode)
    const desiredSubtotal = Math.floor(targetIncl / (1 + options.taxRate))
    adjustmentLine.amount = desiredSubtotal - subtotal
    subtotal = desiredSubtotal
  } else if (adjustmentLine) {
    adjustmentLine.amount = 0
  }

  const { tax, total: rawTotal } = applyTax(subtotal, options.taxRate)
  const totalInclTax = roundTotal(rawTotal, options.roundingUnit, options.roundingMode)

  return {
    lines: linesCopy,
    subtotal,
    tax: totalInclTax - subtotal,
    totalInclTax,
  }
}

export function computeSimpleTotal(lines: QuoteLine[], taxRate: number): number {
  const subtotal = lines.reduce((sum, line) => {
    if (line.type === "fixed") return sum + line.amount
    if (line.type === "unit") return sum + line.quantity * line.unitPrice
    if (line.type === "auto" || line.type === "adjustment") return sum + line.amount
    return sum
  }, 0)
  return Math.round(subtotal * (1 + taxRate))
}
