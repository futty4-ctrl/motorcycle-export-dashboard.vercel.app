// types/document.ts

export interface DocumentRecord {
  id: string
  created_at: string
  doc_type: '見積書' | '請求書' | '領収書'
  doc_number: string | null
  doc_date: string
  client_name: string
  client_address: string | null
  total_amount: number
  issuer_preset: string
  detail_json: Record<string, unknown>
  file_url: string | null
  notes: string | null
}

export interface IssuerPreset {
  id: string
  name: string
  display_name: string | null
  address: string | null
  tel: string | null
  person: string | null
  bank_name: string | null
  bank_type: string | null
  bank_number: string | null
  bank_holder: string | null
  stamp_image_url: string | null
}

export interface EstimateItem {
  name: string
  detail?: string
  total: number
  qty?: string
  unit?: string
}

export interface EstimateData {
  client: string
  date: string
  validUntil: string
  schedule: string
  items: EstimateItem[]
  note?: string
  issuerPreset?: string
}

export interface InvoiceItem {
  name: string
  qty: string
  unit: string
  price: number
  amount: number
  note?: string
}

export interface InvoiceData {
  client: string
  clientAddress?: string
  invoiceNo?: string
  date: string
  dueDate: string
  items: InvoiceItem[]
  note?: string
  bank?: {
    name: string
    type: string
    number: string
    holder: string
  }
  issuerPreset?: string
}

export interface ReceiptData {
  client: string
  amount: number
  description: string
  date: string
  breakdown?: {
    subtotal: number
    tax: number
  }
  issuerPreset?: string
}
