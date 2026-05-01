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

const KNOWN_CATEGORIES = new Set([
  "タンク",
  "シート",
  "マフラー",
  "ライト",
  "ヘッドライト",
  "ホイール",
  "フォーク",
  "サイレンサー",
  "エキパイ",
  "ステップ",
  "ハンドル",
  "ミラー",
  "ウィンカー",
  "ウインカー",
  "アッパー",
  "カウル",
  "テール",
  "エンジン",
  "キャブ",
  "キャリア",
  "スプロケ",
  "フェンダー",
  "バンパー",
  "ガード",
  "スイッチ",
  "レバー",
  "ボックス",
  "BOX",
  "ＢＯＸ",
  "ショック",
  "キャリパー",
  "ブレーキ",
  "チェーン",
  "ディスク",
  "Bランプ",
  "Ｂランプ",
  "クラッチ",
  "メーター",
  "パーツセット",
  "外装セット",
  "足回りセット",
  "ライト",
  "その他",
  "ＳＰ忠男",
])

const CONDITION_RE = /[／\/](超特大|特大|中|良|並|難|大|小)$/

function splitMiddle(combined: string): {
  category: string
  productName: string
  maker: string
} {
  const tokens = combined.split(/\s+/).filter(Boolean)
  let category = ""
  let rest = tokens
  if (tokens.length > 1 && KNOWN_CATEGORIES.has(tokens[0])) {
    category = tokens[0]
    rest = tokens.slice(1)
  }
  // 商品名末尾の ／(中|大|...) を持つトークンを探す（最後のもの）
  let conditionIdx = -1
  for (let i = 0; i < rest.length; i++) {
    if (CONDITION_RE.test(rest[i])) conditionIdx = i
  }
  let productName: string
  let maker: string
  if (conditionIdx >= 0) {
    productName = rest.slice(0, conditionIdx + 1).join(" ")
    maker = rest.slice(conditionIdx + 1).join(" ")
  } else {
    // 末尾を maker、残りを product
    if (rest.length >= 2) {
      productName = rest.slice(0, -1).join(" ")
      maker = rest[rest.length - 1]
    } else {
      productName = rest.join(" ")
      maker = ""
    }
  }
  return { category, productName: productName.trim(), maker: maker.trim() }
}

/**
 * BDSマイリストPDFのテキストを行単位でパース
 *
 * 実際のpdfjs抽出順:
 *   YYYY 年 MM 月 DD 日 場所 ロット カテゴリ 商品名 メーカー 評価 開始価格 落|流 価格 商品数
 *
 * 商品数は末尾。次の日付または特殊マーカーで終端を判別。
 */
export function parseBdsMylistText(rawText: string): BdsMylistRow[] {
  const halfText = toHalfWidth(rawText)
  const flat = halfText.replace(/\s+/g, " ")

  const rowRe =
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s+(関西|関東|九州|大阪|堺|東京|北海道|東北|中部|中国|四国|沖縄)\s+(\d{4,6})\s+([\s\S]+?)\s+([1-9])\s+([\d,]+)\s+(落|流)\s+([\d,]+)\s+(\d+)(?=\s+\d{4}\s*年|\s+★|\s+●|\s+自社|\s*$)/g

  const rows: BdsMylistRow[] = []
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(flat))) {
    const [
      ,
      yyyy,
      mm,
      dd,
      venue,
      lotNo,
      middle,
      evalStr,
      startPriceStr,
      resultMark,
      finalPriceStr,
      qtyStr,
    ] = m

    const date = `${yyyy}年${mm.padStart(2, "0")}月${dd.padStart(2, "0")}日`
    const { category, productName, maker } = splitMiddle(middle)
    const cls = classifyRow(category, productName, maker)
    const vehicleModel =
      cls === "single" ? extractVehicleModel(productName) : null
    const stripped = productName.replace(CONDITION_RE, "").trim()
    // 検索性向上: パーツ語・状態語の前後にスペース挿入
    const partWord =
      "タンク|シート|マフラー|ホイール|フォーク|サイレンサー|エキパイ|ハンドル|ステップ|ミラー|ウィンカー|ウインカー|アッパー|カウル|テール|エンジン|キャブ|キャリア|フェンダー|バンパー|ガード|スイッチ|レバー|ボックス|ショック|キャリパー|ブレーキ|チェーン|ディスク|クラッチ|メーター|フェアリング|バッテリー|プラグ|ヘッドライト|スプロケ|セット|キット"
    const cleanName = stripped
      .replace(/(純正|社外|中古|新品)/g, " $1 ")
      .replace(new RegExp(`(${partWord})`, "g"), " $1 ")
      .replace(/\s+/g, " ")
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
