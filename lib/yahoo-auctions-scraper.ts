import * as cheerio from "cheerio"

export type YahooAuctionItem = {
  title: string
  price: string
  bidCount: number
  timeLeft: string
  imageUrl: string
  itemUrl: string
}

const CACHE_KEY = "default"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const BASE = "https://auctions.yahoo.co.jp"

/**
 * ヤフオク出品者ページを取得して HTML を返す
 */
export async function fetchSellerPageHtml(sellerId: string): Promise<string> {
  const url = `${BASE}/seller/${encodeURIComponent(sellerId)}`
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`ヤフオクページの取得に失敗しました: ${res.status}`)
  return res.text()
}

/**
 * HTML から出品中アイテム一覧を抽出する（複数セレクタで対応）
 */
export function parseSellerPageHtml(html: string, sellerId: string): YahooAuctionItem[] {
  const $ = cheerio.load(html)
  const items: YahooAuctionItem[] = []
  const seen = new Set<string>()

  // 商品リンク（/jp/auction/ を含む）を探す
  const itemLinks = $('a[href*="/jp/auction/"], a[href*="page.auctions.yahoo.co.jp/jp/auction/"]')
  itemLinks.each((_, el) => {
    const href = $(el).attr("href")
    if (!href) return
    const fullUrl = href.startsWith("http") ? href : new URL(href, BASE).href
    const auctionIdMatch = fullUrl.match(/\/auction\/([a-zA-Z0-9]+)/)
    if (!auctionIdMatch || seen.has(auctionIdMatch[1])) return
    seen.add(auctionIdMatch[1])

    const $link = $(el)
    const $card = $link.closest("li, .Product, .product, [class*='Product'], [class*='Item'], .lvProduct, .smlItem")
    const $root = $card.length ? $card : $link.parent()

    const title =
      $root.find(".Product__title, .product-title, [class*='title']").first().text().trim() ||
      $link.find("img").attr("alt") ||
      $link.text().trim() ||
      "（タイトルなし）"

    const priceText =
      $root.find(".Product__price, .price, [class*='Price'], .lvPrice").first().text().trim() ||
      $root.text().replace(/\s/g, " ")
    const priceMatch = priceText.match(/¥\s*([0-9,]+)|([0-9,]+)\s*円/)
    const price = priceMatch ? (priceMatch[1] || priceMatch[2] || "0").replace(/,/g, "") : "0"

    const bidText =
      $root.find("[class*='bid'], [class*='Bid']").first().text().trim() || $root.text()
    const bidMatch = bidText.match(/(\d+)\s*入札|入札\s*(\d+)/)
    const bidCount = bidMatch ? parseInt(bidMatch[1] || bidMatch[2] || "0", 10) : 0

    const timeText =
      $root.find("[class*='time'], [class*='Time'], [class*='remaining']").first().text().trim() ||
      ""
    const timeLeft = timeText || "—"

    const imgSrc =
      $root.find("img").first().attr("src") ||
      $link.find("img").attr("src") ||
      $root.find("img").first().attr("data-src") ||
      ""

    const imageUrl = imgSrc
      ? imgSrc.startsWith("http")
        ? imgSrc
        : new URL(imgSrc, BASE).href
      : ""

    items.push({
      title: title.slice(0, 80),
      price: price === "0" ? "—" : `¥${Number(price).toLocaleString()}`,
      bidCount,
      timeLeft,
      imageUrl,
      itemUrl: fullUrl,
    })
  })

  return items
}

export { CACHE_KEY }
