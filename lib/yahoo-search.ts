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

export function extractBdsLotNo(url: string): string | null {
  if (!url) return null
  const match = url.match(/NJP\d+\/(NJP\d+)/)
  return match ? match[1] : null
}
