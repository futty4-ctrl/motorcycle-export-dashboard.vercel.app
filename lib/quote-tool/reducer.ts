import type { QuoteLine, QuoteGroup, QuoteState, RoundingMode, RoundingUnit } from "./types"
import { TAX_RATE } from "./types"
import { DEFAULT_GROUPS } from "./presets"

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export type QuoteAction =
  | { type: "SET_GROUPS"; payload: QuoteGroup[] }
  | { type: "ADD_GROUP"; payload: { label: string } }
  | { type: "UPDATE_GROUP"; payload: { id: string; label: string } }
  | { type: "ADD_LINE"; payload: { groupId: string; line?: Partial<QuoteLine> } }
  | { type: "UPDATE_LINE"; payload: { id: string; patch: Partial<QuoteLine> } }
  | { type: "DELETE_LINE"; payload: { id: string } }
  | { type: "MOVE_LINE"; payload: { id: string; afterId: string | null } }
  | { type: "SET_TARGET_TOTAL"; payload: number | null }
  | { type: "SET_ROUNDING"; payload: { unit?: RoundingUnit; mode?: RoundingMode } }
  | { type: "SET_AUTO_DISTRIBUTION"; payload: "equal" | "ratio" }
  | { type: "ADD_PRESET"; payload: { preset: { label: string; type: QuoteLine["type"]; quantity?: number; unitPrice?: number; amount?: number; autoRatio?: number }; groupId: string } }
  | { type: "ENSURE_ADJUSTMENT_LINE" }
  | { type: "IMPORT_QUOTE"; payload: { groups: QuoteGroup[]; lines: QuoteLine[]; targetTotalInclTax?: number | null } }
  | { type: "SET_BILL_TO"; payload: { billToName?: string; billToAddress?: string } }
  | { type: "SET_COMPANY"; payload: { companyName?: string; companyAddress?: string; sealImageDataUrl?: string } }
  | { type: "SET_NOTE"; payload: string }
  | { type: "SET_VALID_UNTIL"; payload: string }

function createAdjustmentLine(groupId: string): QuoteLine {
  return {
    id: uid(),
    label: "調整",
    type: "adjustment",
    quantity: 0,
    unitPrice: 0,
    amount: 0,
    groupId,
  }
}

export const initialQuoteState: QuoteState = {
  groups: [...DEFAULT_GROUPS],
  lines: [
    createAdjustmentLine(DEFAULT_GROUPS[DEFAULT_GROUPS.length - 1].id),
  ],
  billToName: "",
  billToAddress: "",
  companyName: "",
  companyAddress: "",
  sealImageDataUrl: "",
  note: "",
  validUntil: "",
  targetTotalInclTax: null,
  autoDistribution: "equal",
  roundingUnit: 100,
  roundingMode: "round",
  taxRate: TAX_RATE,
}

export function quoteReducer(state: QuoteState, action: QuoteAction): QuoteState {
  switch (action.type) {
    case "SET_GROUPS":
      return { ...state, groups: action.payload }
    case "ADD_GROUP": {
      const newGroup: QuoteGroup = {
        id: uid(),
        label: action.payload.label,
        order: state.groups.length,
      }
      return { ...state, groups: [...state.groups, newGroup] }
    }
    case "UPDATE_GROUP":
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.payload.id ? { ...g, label: action.payload.label } : g
        ),
      }
    case "ADD_LINE": {
      const groupId = action.payload.groupId
      const line: QuoteLine = {
        id: uid(),
        label: action.payload.line?.label ?? "新規項目",
        type: action.payload.line?.type ?? "unit",
        quantity: action.payload.line?.quantity ?? 1,
        unitPrice: action.payload.line?.unitPrice ?? 0,
        amount: action.payload.line?.amount ?? 0,
        groupId,
        ...(action.payload.line?.autoRatio != null && { autoRatio: action.payload.line.autoRatio }),
      }
      const lines = [...state.lines, line]
      return { ...state, lines }
    }
    case "UPDATE_LINE":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload.patch } : l
        ),
      }
    case "DELETE_LINE":
      return { ...state, lines: state.lines.filter((l) => l.id !== action.payload.id) }
    case "MOVE_LINE": {
      const { id, afterId } = action.payload
      const idx = state.lines.findIndex((l) => l.id === id)
      if (idx === -1) return state
      const rest = state.lines.filter((l) => l.id !== id)
      const afterIdx = afterId == null ? -1 : rest.findIndex((l) => l.id === afterId)
      const insertAt = afterIdx === -1 ? 0 : afterIdx + 1
      const lines = [...rest.slice(0, insertAt), state.lines[idx], ...rest.slice(insertAt)]
      return { ...state, lines }
    }
    case "SET_TARGET_TOTAL":
      return { ...state, targetTotalInclTax: action.payload }
    case "SET_ROUNDING":
      return {
        ...state,
        roundingUnit: action.payload.unit ?? state.roundingUnit,
        roundingMode: action.payload.mode ?? state.roundingMode,
      }
    case "SET_AUTO_DISTRIBUTION":
      return { ...state, autoDistribution: action.payload }
    case "ADD_PRESET": {
      const { preset, groupId } = action.payload
      const line: QuoteLine = {
        id: uid(),
        label: preset.label,
        type: preset.type,
        quantity: preset.quantity ?? 1,
        unitPrice: preset.unitPrice ?? 0,
        amount: preset.amount ?? 0,
        groupId,
        ...(preset.autoRatio != null && { autoRatio: preset.autoRatio }),
      }
      return { ...state, lines: [...state.lines, line] }
    }
    case "ENSURE_ADJUSTMENT_LINE": {
      const hasAdjustment = state.lines.some((l) => l.type === "adjustment")
      if (hasAdjustment) return state
      const lastGroupId = state.groups[state.groups.length - 1]?.id ?? state.groups[0].id
      return { ...state, lines: [...state.lines, createAdjustmentLine(lastGroupId)] }
    }
    case "IMPORT_QUOTE":
      return {
        ...state,
        groups: action.payload.groups,
        lines: action.payload.lines,
        ...(action.payload.targetTotalInclTax !== undefined && {
          targetTotalInclTax: action.payload.targetTotalInclTax,
        }),
      }
    case "SET_BILL_TO":
      return {
        ...state,
        ...(action.payload.billToName !== undefined && { billToName: action.payload.billToName }),
        ...(action.payload.billToAddress !== undefined && { billToAddress: action.payload.billToAddress }),
      }
    case "SET_COMPANY":
      return {
        ...state,
        ...(action.payload.companyName !== undefined && { companyName: action.payload.companyName }),
        ...(action.payload.companyAddress !== undefined && { companyAddress: action.payload.companyAddress }),
        ...(action.payload.sealImageDataUrl !== undefined && { sealImageDataUrl: action.payload.sealImageDataUrl }),
      }
    case "SET_NOTE":
      return { ...state, note: action.payload }
    case "SET_VALID_UNTIL":
      return { ...state, validUntil: action.payload }
    default:
      return state
  }
}
