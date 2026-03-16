import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

// カテゴリID定義
const CATEGORIES: Record<string, string> = {
  "26316": "オートバイ車体",
  "26308": "オートバイ全体",
  "26310": "アクセサリー",
  "": "カテゴリ制限なし",
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("q")
  if (!keyword)
    return NextResponse.json({ error: "keyword required" }, { status: 400 })

  const minPrice = req.nextUrl.searchParams.get("min") ?? ""
  const maxPrice = req.nextUrl.searchParams.get("max") ?? ""
  const exclude = req.nextUrl.searchParams.get("exclude") ?? ""
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100)
  const cat = req.nextUrl.searchParams.get("cat") ?? "26316"

  try {
    let url = `https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodeURIComponent(keyword)}&va=${encodeURIComponent(keyword)}&exflg=1&b=1&n=${limit}&s1=end&o1=d`

    if (cat) url += `&auccat=${cat}`
    if (minPrice) url += `&min=${minPrice}`
    if (maxPrice) url += `&max=${maxPrice}`

    // ヤフオク除外キーワード（vs パラメータ）
    if (exclude) {
      const excludeWords = exclude.split(/[,、\s]+/).filter(Boolean)
      url += `&vs=${encodeURIComponent(excludeWords.join(" "))}`
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ja,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 3600 },
    })

    const html = await res.text()
    const $ = cheerio.load(html)

    const results: {
      title: string
      price: number
      bids: number
      endDate: string
      url: string
    }[] = []

    const seen = new Set<string>()
    const excludeWords = exclude ? exclude.split(/[,、\s]+/).filter(Boolean) : []

    $('a[data-cl-params*="_cl_vmodule:aal"][href*="/jp/auction/"]').each((_, el) => {
      const clParams = $(el).attr("data-cl-params") ?? ""
      if (!clParams.includes("_cl_link:tc")) return

      const href = $(el).attr("href") ?? ""
      if (!href || seen.has(href)) return
      seen.add(href)

      const title = $(el).attr("title") ?? $(el).text().trim()
      if (!title) return

      // クライアント側でも除外キーワードフィルター
      if (excludeWords.some((w) => title.includes(w))) return

      const etcPart = clParams.split("etc:")[1] ?? clParams
      const priceMatch = etcPart.match(/\bp=(\d+)/)
      const bidsMatch = etcPart.match(/\bb=(\d+)/)
      const etmMatch = etcPart.match(/\betm=(\d+)/)

      const price = priceMatch ? parseInt(priceMatch[1], 10) : 0
      if (!price) return

      // 価格帯フィルター（クライアント側でも確認）
      if (minPrice && price < parseInt(minPrice)) return
      if (maxPrice && price > parseInt(maxPrice)) return

      const bids = bidsMatch ? parseInt(bidsMatch[1], 10) : 0
      const endDate = etmMatch
        ? new Date(parseInt(etmMatch[1], 10) * 1000).toLocaleDateString("ja-JP")
        : ""

      results.push({ title, price, bids, endDate, url: href })
    })

    if (results.length === 0) {
      return NextResponse.json({ results: [], stats: null, category: CATEGORIES[cat] ?? cat })
    }

    const prices = results.map((r) => r.price).sort((a, b) => a - b)
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    const min = prices[0]
    const max = prices[prices.length - 1]
    const median = prices[Math.floor(prices.length / 2)]

    const trimCount = Math.floor(prices.length * 0.1)
    const trimmed = prices.slice(trimCount, prices.length - trimCount)
    const trimmedAvg =
      trimmed.length > 0
        ? Math.round(trimmed.reduce((s, p) => s + p, 0) / trimmed.length)
        : avg

    return NextResponse.json({
      results,
      category: CATEGORIES[cat] ?? cat,
      stats: {
        count: results.length,
        avg,
        trimmedAvg,
        median,
        min,
        max,
        range: {
          low: prices[Math.floor(prices.length * 0.25)],
          high: prices[Math.floor(prices.length * 0.75)],
        },
      },
    })
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 })
  }
}
