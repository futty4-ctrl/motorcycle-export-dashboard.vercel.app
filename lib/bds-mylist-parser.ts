/**
 * BDSマイリストPDFのテキストパース
 *
 * フォーマット例:
 *   2026年05月01日 関西 6524 1 タンク ＫＴＭ３９０アドベンチャー純正タンク／中 ＫＴＭ 4 3,000 落 6,000
 *
 * カラム:
 *   日付 / 場所 / 出番(ロット) / 商品数 / カテゴリ / 商品名 / メーカー / 評価 / スタート価格 / 落流 / 落札価格
 */

export type BdsMylistRow = {
  date: string
  venue: string
  lotNo: string
  qty: number
  category: string
  productName: string
  maker: string
  evaluation: number
  startPrice: number
  result: "落" | "流" | null
  finalPrice: number
  classification: "single" | "set" | "unknown"
  vehicleModel: string | null
  searchKeyword: string
}

const SET_CATEGORIES = new Set([
  "パーツセット",
  "外装セット",
  "足回りセット",
])

const SET_KEYWORDS = ["セット"]
const UNKNOWN_KEYWORDS = ["車種不明"]

function toHalfWidth(s: string): string {
  return s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/\u3000/g, " ")
}

function parseNumber(s: string): number {
  return parseInt(s.replace(/[,\s]/g, ""), 10) || 0
}

/**
 * 商品名から車種名を抽出
 * 例: "KTM390アドベンチャー純正タンク／中" → "KTM390アドベンチャー"
 *     "ZRX1200R社外シート／中" → "ZRX1200R"
 *     "モンキー純正タンク／中" → "モンキー"
 *     "車種不明社外マフラー／大" → null
 */
export function extractVehicleModel(productName: string): string | null {
  const half = toHalfWidth(productName)
  if (UNKNOWN_KEYWORDS.some((kw) => half.includes(kw))) return null

  // パーツ名キーワードの直前までを車種名とみなす
  const partKeywordPattern =
    "純正|社外|系純正|系社外|タンク|シート|マフラー|ライト|ホイール|フォーク|サイレンサー|エキパイ|ステップ|ハンドル|ミラー|ウインカー|ウィンカー|アッパー|カウル|テール|エンジン|キャブ|キャリア|スプロケ|フェアリング|ヘッドライト|ヘッドライトバイザー|フェンダー|バンパー|ガード|スイッチ|レバー|ボックス|ショック|キャリパー|ブレーキ|チェーン|ディスク"
  const re = new RegExp(`^(.+?)(?=${partKeywordPattern})`)
  const match = half.match(re)
  if (!match) return null
  const model = match[1].trim().replace(/[／\/]+$/, "")
  return model || null
}

function classifyRow(
  category: string,
  productName: string,
  maker: string
): "single" | "set" | "unknown" {
  if (SET_CATEGORIES.has(category)) return "set"
  if (SET_KEYWORDS.some((kw) => productName.includes(kw))) return "set"
  if (UNKNOWN_KEYWORDS.some((kw) => productName.includes(kw))) return "unknown"
  if (maker === "メーカー不明" && !extractVehicleModel(productName)) {
    return "unknown"
  }
  return "single"
}

function splitNameMaker(combined: string): { name: string; maker: string } {
  const m = combined.match(
    /^(.+?[／\/](?:超特大|特大|中|良|並|難|大|小))\s+(.+)$/
  )
  if (m) return { name: m[1].trim(), maker: m[2].trim() }
  return { name: combined.trim(), maker: "" }
}

/**
 * BDSマイリストPDFのテキストを行単位でパース
 * 末尾アンカー: 評価(数字1桁) + 開始価格 + 落|流 + 落札価格
 */
export function parseBdsMylistText(rawText: string): BdsMylistRow[] {
  const halfText = toHalfWidth(rawText)
  const flat = halfText.replace(/\s+/g, " ")

  const rowRe =
    /(\d{4}年\d{2}月\d{2}日)\s+(関東|関西|九州|大阪|堺|東京|北海道|東北|中部|中国|四国|沖縄)\s+(\d{4,6})\s+(\d+)\s+(\S*?)\s+(.+?)\s+([1-9])\s+([\d,]+)\s+(落|流)\s+([\d,]+)/g

  const rows: BdsMylistRow[] = []
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(flat))) {
    const [
      ,
      date,
      venue,
      lotNo,
      qtyStr,
      categoryRaw,
      combined,
      evalStr,
      startPriceStr,
      resultMark,
      finalPriceStr,
    ] = m

    let category = categoryRaw
    let nameMakerStr = combined
    // カテゴリ欠落（categoryに／が含まれている場合は商品名扱い）
    if (categoryRaw.includes("／") || categoryRaw.includes("/")) {
      category = ""
      nameMakerStr = `${categoryRaw} ${combined}`
    }

    const { name: productName, maker } = splitNameMaker(nameMakerStr)
    const cls = classifyRow(category, productName, maker)
    const vehicleModel =
      cls === "single" ? extractVehicleModel(productName) : null
    const cleanName = productName
      .replace(/[／\/](中|良|並|難|超特大|特大|大|小)$/, "")
      .trim()

    rows.push({
      date,
      venue,
      lotNo,
      qty: parseNumber(qtyStr),
      category,
      productName,
      maker,
      evaluation: parseNumber(evalStr),
      startPrice: parseNumber(startPriceStr),
      result: resultMark === "落" || resultMark === "流" ? resultMark : null,
      finalPrice: parseNumber(finalPriceStr),
      classification: cls,
      vehicleModel,
      searchKeyword: cleanName,
    })
  }
  return rows
}

/**
 * パース結果のサマリ
 */
export function summarizeMylist(rows: BdsMylistRow[]) {
  const total = rows.length
  const single = rows.filter((r) => r.classification === "single").length
  const set = rows.filter((r) => r.classification === "set").length
  const unknown = rows.filter((r) => r.classification === "unknown").length
  const sold = rows.filter((r) => r.result === "落").length
  const stream = rows.filter((r) => r.result === "流").length
  return { total, single, set, unknown, sold, stream }
}
