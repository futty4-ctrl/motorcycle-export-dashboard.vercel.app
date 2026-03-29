import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("q")
  if (!keyword)
    return NextResponse.json({ error: "keyword required" }, { status: 400 })

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "60"), 120)

  try {
    // eBayのSold listings検索
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}&_sop=13&LH_Complete=1&LH_Sold=1&_ipg=${limit}&rt=nc`

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 3600 },
    })

    const html = await res.text()
    const $ = cheerio.load(html)

    const results: {
      title: string
      price: number
      currency: string
      date: string
      url: string
      image: string
    }[] = []

    $(".s-item").each((_, el) => {
      const title = $(el).find(".s-item__title span").text().trim()
      if (!title || title === "Shop on eBay") return

      const priceText = $(el).find(".s-item__price").first().text().trim()
      const priceMatch = priceText.match(/[\d,.]+/)
      if (!priceMatch) return
      const price = parseFloat(priceMatch[0].replace(/,/g, ""))
      if (!price || price <= 0) return

      const currency = priceText.includes("$") ? "USD" : priceText.includes("£") ? "GBP" : priceText.includes("€") ? "EUR" : "USD"

      const href = $(el).find(".s-item__link").attr("href") ?? ""
      const image = $(el).find(".s-item__image-wrapper img").attr("src") ?? ""

      results.push({ title, price, currency, date: "", url: href, image })
    })

    if (results.length === 0) {
      return NextResponse.json({ results: [], stats: null })
    }

    const prices = results.map((r) => r.price).sort((a, b) => a - b)
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length * 100) / 100
    const median = prices[Math.floor(prices.length / 2)]
    const min = prices[0]
    const max = prices[prices.length - 1]

    const trimCount = Math.floor(prices.length * 0.1)
    const trimmed = prices.slice(trimCount, prices.length - trimCount)
    const trimmedAvg = trimmed.length > 0
      ? Math.round(trimmed.reduce((s, p) => s + p, 0) / trimmed.length * 100) / 100
      : avg

    return NextResponse.json({
      results: results.slice(0, 20),
      stats: {
        count: results.length,
        avg,
        trimmedAvg,
        median,
        min,
        max,
      },
    })
  } catch {
    return NextResponse.json({ error: "eBay fetch failed" }, { status: 500 })
  }
}
