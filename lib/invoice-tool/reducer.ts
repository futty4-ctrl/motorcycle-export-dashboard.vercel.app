import type { InvoiceState, InvoiceRow, InvoiceBank } from "./types"

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export type InvoiceAction =
  | { type: "SET_ISSUE_DATE"; payload: string }
  | { type: "SET_BILL_TO"; payload: string }
  | { type: "SET_BILL_TO_ADDRESS"; payload: string }
  | { type: "SET_SUBJECT"; payload: string }
  | { type: "SET_BANK"; payload: Partial<InvoiceBank> }
  | { type: "SET_NOTE"; payload: string }
  | { type: "SET_COMPANY"; payload: { companyName?: string; companyAddress?: string; sealImageDataUrl?: string } }
  | { type: "ADD_ROW"; payload?: Partial<InvoiceRow> }
  | { type: "UPDATE_ROW"; payload: { id: string; patch: Partial<InvoiceRow> } }
  | { type: "DELETE_ROW"; payload: { id: string } }
  | { type: "REPLACE_STATE"; payload: Partial<InvoiceState> }

export function invoiceReducer(state: InvoiceState, action: InvoiceAction): InvoiceState {
  switch (action.type) {
    case "SET_ISSUE_DATE":
      return { ...state, issueDate: action.payload }
    case "SET_BILL_TO":
      return { ...state, billTo: action.payload }
    case "SET_BILL_TO_ADDRESS":
      return { ...state, billToAddress: action.payload }
    case "SET_SUBJECT":
      return { ...state, subject: action.payload }
    case "SET_BANK":
      return { ...state, bank: { ...state.bank, ...action.payload } }
    case "SET_NOTE":
      return { ...state, note: action.payload }
    case "SET_COMPANY":
      return {
        ...state,
        ...(action.payload.companyName !== undefined && { companyName: action.payload.companyName }),
        ...(action.payload.companyAddress !== undefined && { companyAddress: action.payload.companyAddress }),
        ...(action.payload.sealImageDataUrl !== undefined && { sealImageDataUrl: action.payload.sealImageDataUrl }),
      }
    case "ADD_ROW": {
      const row: InvoiceRow = {
        id: uid(),
        description: action.payload?.description ?? "",
        quantity: action.payload?.quantity ?? "",
        unit: action.payload?.unit ?? "",
        unitPrice: action.payload?.unitPrice ?? 0,
        amount: action.payload?.amount ?? 0,
      }
      return { ...state, rows: [...state.rows, row] }
    }
    case "UPDATE_ROW":
      return {
        ...state,
        rows: state.rows.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.patch } : r
        ),
      }
    case "DELETE_ROW":
      return { ...state, rows: state.rows.filter((r) => r.id !== action.payload.id) }
    case "REPLACE_STATE":
      return { ...state, ...action.payload }
    default:
      return state
  }
}
