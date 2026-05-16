// scripts/import-bds.mjs
// BDS一覧テキストをファイルから読み込んでsupabaseに一括INSERT
// usage: node scripts/import-bds.mjs tmp/bds_pages.txt [auction_date YYYY-MM-DD]

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

const envPath = path.resolve(".env.local")
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const MAKER_MAP = {
  H: "ホンダ", Y: "ヤマハ", S: "スズキ", K: "カワサキ",
  B: "BMW", D: "ドゥカティ", T: "トライアンフ", A: "アプリリア",
  P: "ピアジオ", KT: "KTM", HQ: "ハスクバーナ", HD: "ハーレー", I: "インディアン",
  "+": "輸入車",
}

function wareToYear(w) {
  if (!w) return ""
  const m = w.match(/^(S|H|R)\s*(\d+)$/)
  if (!m) return w
  const n = parseInt(m[2], 10)
  if (m[1] === "S") return String(1925 + n)
  if (m[1] === "H") return String(1988 + n)
  if (m[1] === "R") return String(2018 + n)
  return w
}

function parseBdsText(text) {
  const rows = []
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    if (!/(定例|蚤の市)/.test(line)) continue

    const parts = line
      .replace(/📊\s*記録/g, "")
      .replace(/セリ終了/g, "")
      .split(/\t+|\s{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (parts.length < 6) continue

    let region = "", auction_type = "定例", lot_number = "", maker_code = ""
    let model_name = "", chassis_number = "", displacement_cc = null
    let first_registration = "", inspection = "", mileage_km = null, color = ""
    const scores = []
    let start_price = null, result_status = "unknown", sold_price = null

    for (const p of parts) {
      if (/(定例|蚤の市)/.test(p)) {
        const m = p.match(/(関[東西]|東北|九州|中部|北海道|四国|中国)?\s*(定例|蚤の市)/)
        if (m) { region = m[1] || ""; auction_type = m[2] }
        continue
      }
      if (/^[A-Z]\s+\d{4}$/.test(p)) { lot_number = p; continue }
      if (/^[A-Z+]{1,2}$/.test(p) && !maker_code && lot_number) { maker_code = p; continue }
      if (/^[A-Z][A-Z0-9]*-[\d*]+/.test(p) && !chassis_number) { chassis_number = p; continue }
      if (/^\d+cc$/.test(p)) { displacement_cc = parseInt(p, 10); continue }
      if (/^[\d,]+cc$/.test(p)) { displacement_cc = parseInt(p.replace(/,/g, ""), 10); continue }
      if (/^\*?\s*[\d,]+K$/.test(p)) {
        const m = p.match(/([\d,]+)K/)
        if (m) mileage_km = parseInt(m[1].replace(/,/g, ""), 10)
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
        scores.push(parseInt(p, 10)); continue
      }
      if (/^[\d,]+$/.test(p) && start_price === null && lot_number) {
        start_price = parseInt(p.replace(/,/g, ""), 10); continue
      }
      if (maker_code && !model_name && !/^[\d,]+$/.test(p)) { model_name = p; continue }
      if (/[\u3040-\u9FFF]/.test(p) && !/(定例|蚤の市|落|流|セリ)/.test(p) && model_name && !color) {
        color = p; continue
      }
    }

    if (!model_name) continue

    rows.push({
      region, auction_type, lot_number, maker_code,
      maker_name: MAKER_MAP[maker_code] || maker_code,
      model_name, chassis_number, displacement_cc,
      first_registration, inspection, mileage_km, color,
      scores, start_price, result_status, sold_price,
    })
  }

  return rows
}

async function main() {
  const file = process.argv[2] || "tmp/bds_pages.txt"
  const auctionDate = process.argv[3] || new Date().toISOString().split("T")[0]
  const text = fs.readFileSync(file, "utf8")
  const parsed = parseBdsText(text)

  console.log(`✓ 解析: ${parsed.length}件`)
  console.log(`  蚤の市: ${parsed.filter((r) => r.auction_type === "蚤の市").length}件`)
  console.log(`  定例: ${parsed.filter((r) => r.auction_type === "定例").length}件`)
  console.log(`  落札: ${parsed.filter((r) => r.result_status === "sold").length}件`)
  console.log(`  流札: ${parsed.filter((r) => r.result_status === "unsold").length}件`)
  console.log(`  auction_date: ${auctionDate}`)

  const records = parsed.map((r) => ({
    record_type: "history",
    bds_lot_number: r.lot_number.replace(/\s+/g, ""),
    model_name: `${r.maker_name} ${r.model_name}`,
    chassis_number: r.chassis_number || null,
    engine_model: null,
    mileage_km: r.mileage_km,
    displacement_cc: r.displacement_cc,
    first_registration: r.first_registration || null,
    inspection: r.inspection || null,
    parts_included: [
      r.scores[0] != null ? `総${r.scores[0]}` : null,
      r.scores[1] != null ? `E${r.scores[1]}` : null,
      r.scores[2] != null ? `F${r.scores[2]}` : null,
      r.scores[3] != null ? `外${r.scores[3]}` : null,
      r.scores[4] != null ? `R${r.scores[4]}` : null,
      r.scores[5] != null ? `電${r.scores[5]}` : null,
      r.scores[6] != null ? `車${r.scores[6]}` : null,
    ].filter(Boolean).join(" ") || null,
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
  }))

  // 既存Lot#チェック（UPSERT代替）
  const lotNumbers = records.map((r) => r.bds_lot_number)
  const { data: existing } = await supabase
    .from("auction_history")
    .select("bds_lot_number")
    .in("bds_lot_number", lotNumbers)
  const existingSet = new Set((existing || []).map((r) => r.bds_lot_number))
  const toInsert = records.filter((r) => !existingSet.has(r.bds_lot_number))

  console.log(`  → 新規: ${toInsert.length}件 / 重複スキップ: ${records.length - toInsert.length}件`)

  if (toInsert.length === 0) {
    console.log("挿入対象なし")
    return
  }

  // chunk 500
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500)
    const { error } = await supabase.from("auction_history").insert(chunk)
    if (error) {
      console.error("ERROR:", error.message)
      process.exit(1)
    }
    inserted += chunk.length
  }
  console.log(`✓ INSERT完了: ${inserted}件`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
