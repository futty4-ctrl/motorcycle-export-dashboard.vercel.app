/**
 * BDS落札結果テキストを auction_history レコードにパース
 * 既存の AuctionImport.tsx の parseBdsTextV2 をサーバー・クライアント両方で使えるよう抽出
 */

const MAKER_MAP: Record<string, string> = {
  H: "ホンダ",
  Y: "ヤマハ",
  S: "スズキ",
  K: "カワサキ",
  B: "BMW",
  D: "ドゥカティ",
  T: "トライアンフ",
  A: "アプリリア",
  P: "ピアジオ",
  KT: "KTM",
  HQ: "ハスクバーナ",
  HD: "ハーレー",
  I: "インディアン",
}

function wareToYear(w: string): string {
  if (!w) return ""
  const m = w.match(/^(S|H|R|昭|平|令)\s*(\d+)$/)
  if (!m) return w
  const era = m[1]
  const num = parseInt(m[2], 10)
  if (era === "S" || era === "昭") return String(1925 + num)
  if (era === "H" || era === "平") return String(1988 + num)
  if (era === "R" || era === "令") return String(2018 + num)
  return w
}

export type ParsedBdsRow = {
  region: string
  auction_type: "蚤の市" | "定例"
  lot_number: string
  maker_code: string
  maker_name: string
  model_name: string
  chassis_number: string
  displacement_cc: number | null
  first_registration: string
  inspection: string
  mileage_km: number | null
  color: string
  scores: number[]
  start_price: number | null
  result_status: "sold" | "unsold" | "unknown"
  sold_price: number | null
}

export function parseBdsText(text: string): ParsedBdsRow[] {
  const rows: ParsedBdsRow[] = []
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    if (!/(定例|蚤の市)/.test(line)) continue
    if (!/(落|流)\s+[\d,]+/.test(line) && !/📊/.test(line)) continue

    const parts = line
      .replace(/📊\s*記録/g, "")
      .replace(/セリ終了/g, "")
      .split(/\t+|\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length < 6) continue

    let region = ""
    let auction_type: "蚤の市" | "定例" = "定例"
    let lot_number = ""
    let maker_code = ""
    let model_name = ""
    let chassis_number = ""
    let displacement_cc: number | null = null
    let first_registration = ""
    let inspection = ""
    let mileage_km: number | null = null
    let color = ""
    const scores: number[] = []
    let start_price: number | null = null
    let result_status: "sold" | "unsold" | "unknown" = "unknown"
    let sold_price: number | null = null

    for (const p of parts) {
      if (/(定例|蚤の市)/.test(p)) {
        const m = p.match(/(関[東西]|東北|九州|中部|北海道|四国|中国)?\s*(定例|蚤の市)/)
        if (m) {
          region = m[1] || ""
          auction_type = m[2] as "蚤の市" | "定例"
        }
        continue
      }
      if (/^[A-Z]\s+\d{4}$/.test(p)) { lot_number = p; continue }
      if (/^[A-Z]{1,2}$/.test(p) && !maker_code && lot_number) { maker_code = p; continue }
      if (/^[A-Z][A-Z0-9]*-[\d*]+/.test(p) && !chassis_number) { chassis_number = p; continue }
      if (/^\d+cc$/.test(p)) { displacement_cc = parseInt(p, 10); continue }
      if (/^[\d,]+K$/.test(p)) {
        mileage_km = parseInt(p.replace(/,/g, "").replace("K", ""), 10)
        continue
      }
      if (/^[HSR]\d{1,2}$/.test(p)) { first_registration = wareToYear(p); continue }
      if (/^R\s*\d+\/\s*\d+$/.test(p)) { inspection = p; continue }
      const resultMatch = p.match(/^(落|流)\s+([\d,]+)$/)
      if (resultMatch) {
        result_status = resultMatch[1] === "落" ? "sold" : "unsold"
        sold_price = parseInt(resultMatch[2].replace(/,/g, ""), 10) || null
        continue
      }
      if (/^\d{1,2}$/.test(p) && parseInt(p, 10) <= 10 && scores.length < 7) {
        scores.push(parseInt(p, 10))
        continue
      }
      if (/^[\d,]+$/.test(p) && start_price === null && lot_number) {
        const n = parseInt(p.replace(/,/g, ""), 10)
        if (n >= 0) { start_price = n; continue }
      }
      if (maker_code && !model_name && !/^[\d,]+$/.test(p)) {
        model_name = p
        continue
      }
      if (
        /[\u3040-\u9FFF]/.test(p) &&
        !/(定例|蚤の市|落|流|セリ)/.test(p) &&
        model_name &&
        !color
      ) {
        color = p
        continue
      }
    }

    if (!model_name) continue

    rows.push({
      region,
      auction_type,
      lot_number,
      maker_code,
      maker_name: MAKER_MAP[maker_code] || maker_code,
      model_name,
      chassis_number,
      displacement_cc,
      first_registration,
      inspection,
      mileage_km,
      color,
      scores,
      start_price,
      result_status,
      sold_price,
    })
  }
  return rows
}

export function bdsRowToRecord(
  r: ParsedBdsRow,
  auctionDate: string
): Record<string, unknown> {
  return {
    record_type: "history",
    bds_lot_number: r.lot_number.replace(/\s+/g, ""),
    model_name: `${r.maker_name} ${r.model_name}`,
    chassis_number: r.chassis_number || null,
    engine_model: null,
    mileage_km: r.mileage_km,
    displacement_cc: r.displacement_cc,
    first_registration: r.first_registration || null,
    inspection: r.inspection || null,
    parts_included:
      [
        r.scores[0] != null ? `総${r.scores[0]}` : null,
        r.scores[1] != null ? `E${r.scores[1]}` : null,
        r.scores[2] != null ? `F${r.scores[2]}` : null,
        r.scores[3] != null ? `外${r.scores[3]}` : null,
        r.scores[4] != null ? `R${r.scores[4]}` : null,
        r.scores[5] != null ? `電${r.scores[5]}` : null,
        r.scores[6] != null ? `車${r.scores[6]}` : null,
      ]
        .filter(Boolean)
        .join(" ") || null,
    start_price: r.start_price,
    reserve_price: null,
    sold_price: r.sold_price,
    result_status: r.result_status,
    region: r.region || null,
    auction_type: r.auction_type,
    auction_date: auctionDate,
    market_sold_count: null,
    market_min_price: null,
    market_max_price: null,
    photo_urls: [],
    source_url: null,
    notes: r.color ? `色: ${r.color}` : "",
  }
}
