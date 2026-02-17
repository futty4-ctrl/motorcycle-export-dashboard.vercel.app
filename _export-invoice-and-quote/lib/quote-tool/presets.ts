import type { QuoteLine } from "./types"

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export type PresetItem = {
  label: string
  type: QuoteLine["type"]
  quantity?: number
  unitPrice?: number
  amount?: number
  autoRatio?: number
}

export function createLineFromPreset(
  preset: PresetItem,
  groupId: string,
  id?: string
): QuoteLine {
  const line: QuoteLine = {
    id: id ?? uid(),
    label: preset.label,
    type: preset.type,
    quantity: preset.quantity ?? 1,
    unitPrice: preset.unitPrice ?? 0,
    amount: preset.amount ?? 0,
    groupId,
  }
  if (preset.autoRatio != null) line.autoRatio = preset.autoRatio
  return line
}

export const PRESETS: PresetItem[] = [
  { label: "2t車 1台", type: "unit", quantity: 1, unitPrice: 35000 },
  { label: "4t車 1台", type: "unit", quantity: 1, unitPrice: 55000 },
  { label: "作業員 1名", type: "unit", quantity: 1, unitPrice: 8000 },
  { label: "作業員 2名", type: "unit", quantity: 2, unitPrice: 8000 },
  { label: "階段割増", type: "fixed", amount: 5000 },
  { label: "エレベーター作業", type: "fixed", amount: 3000 },
  { label: "処分料金（実費）", type: "auto", autoRatio: 1 },
  { label: "諸経費", type: "auto", autoRatio: 1 },
  { label: "その他", type: "auto", autoRatio: 1 },
]

export const DEFAULT_GROUPS = [
  { id: "work", label: "作業費", order: 0 },
  { id: "transport", label: "運搬費", order: 1 },
  { id: "other", label: "その他", order: 2 },
]
