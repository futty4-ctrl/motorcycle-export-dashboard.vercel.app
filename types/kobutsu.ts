export interface KobutsuEntry {
  id: string
  created_at: string
  updated_at: string
  transaction_date: string
  transaction_type: '受入' | '払出'
  price: number
  maker: string
  model: string
  katashiki: string
  frame_no: string
  engine_no: string
  displacement: string
  model_year: string
  body_color: string
  counterparty_name: string
  counterparty_address: string
  counterparty_tel: string
  counterparty_occupation: string
  id_type: string
  id_number: string
  notes: string
  cert_issued: boolean
  cert_issued_at: string | null
}

export interface KobutsuSettings {
  id: string
  shop_name: string
  owner_name: string
  address: string
  tel: string
  license_number: string
  public_safety_commission: string
  license_image_url: string | null
  updated_at: string
}
