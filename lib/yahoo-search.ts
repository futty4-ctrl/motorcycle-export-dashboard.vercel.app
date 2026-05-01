export function buildYahooSearchUrl(
  maker: string,
  productName: string
): { url: string; keyword: string } {
  const skipMakers = [
    "ホンダ",
    "カワサキ",
    "ヤマハ",
    "スズキ",
    "HONDA",
    "KAWASAKI",
    "YAMAHA",
    "SUZUKI",
  ]
  const productHasModel =
    /モンキー|ゴリラ|ダックス|シャリィ|ZRX|Zephyr|ゼファー|CB|GSX|YZF|R1|R6|忍者|Ninja/i.test(
      productName
    )

  const keyword =
    skipMakers.includes(maker) && productHasModel
      ? productName
      : `${maker} ${productName}`

  const cleaned = keyword.replace(/[／\/](中|良|並|難|大|特)$/, "").trim()

  const params = new URLSearchParams({
    p: cleaned,
    b: "1",
    n: "50",
    s1: "end",
    o1: "d",
    fixed: "0",
  })

  return {
    url: `https://auctions.yahoo.co.jp/closedsearch/closedsearch?${params.toString()}`,
    keyword: cleaned,
  }
}

/**
 * BDS商品名をそのまま貼り付けて検索（型式・メーカー不要）
 * 末尾の状態記号（／中 / 良 / 並 等）と先頭の番号を除去
 * 例: "フォルツァ4社外マフラー／中" → "フォルツァ4社外マフラー"
 */
export function buildYahooSearchUrlByName(rawName: string): {
  url: string
  keyword: string
} {
  const cleaned = rawName
    .replace(/[／\/](中|良|並|難|大|特|新品|未使用|難あり)$/, "")
    .replace(/^\d+[\.\)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim()

  const params = new URLSearchParams({
    p: cleaned,
    b: "1",
    n: "50",
    s1: "end",
    o1: "d",
    fixed: "0",
  })

  return {
    url: `https://auctions.yahoo.co.jp/closedsearch/closedsearch?${params.toString()}`,
    keyword: cleaned,
  }
}

export function extractBdsLotNo(url: string): string | null {
  if (!url) return null
  const match = url.match(/NJP\d+\/(NJP\d+)/)
  return match ? match[1] : null
}

/**
 * 型式コードを正規化
 * 全角→半角・空白/ハイフン除去・大文字化
 */
export function normalizeTypeCode(raw: string): string {
  if (!raw) return ""
  return raw
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/[\s　\-_]/g, "")
    .toUpperCase()
}

/**
 * 型式コード主軸の検索URL生成
 * 型式 + パーツ名 でヤフオク終了済みを検索
 */
export function buildYahooSearchUrlByTypeCode(
  typeCode: string,
  partName: string
): { url: string; keyword: string } {
  const code = normalizeTypeCode(typeCode)
  const cleaned = partName.replace(/[／\/](中|良|並|難|大|特)$/, "").trim()
  const keyword = [code, cleaned].filter(Boolean).join(" ")

  const params = new URLSearchParams({
    p: keyword,
    b: "1",
    n: "50",
    s1: "end",
    o1: "d",
    fixed: "0",
  })

  return {
    url: `https://auctions.yahoo.co.jp/closedsearch/closedsearch?${params.toString()}`,
    keyword,
  }
}
