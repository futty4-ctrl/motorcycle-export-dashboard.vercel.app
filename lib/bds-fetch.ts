/**
 * BDS（オークション）車両ページから画像URLを抽出する
 * サーバー側でのみ実行（fetch で HTML 取得 → img src 抽出）
 */

const MAX_IMAGES = 50
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i

/**
 * 指定URLのHTMLを取得し、img の src を抽出する（data-src 等にも対応）
 */
export async function extractImageUrlsFromPage(pageUrl: string): Promise<string[]> {
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`ページの取得に失敗しました: ${res.status}`)
  const html = await res.text()
  const baseUrl = new URL(pageUrl)
  const urls: string[] = []
  const seen = new Set<string>()

  // img src
  const srcRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = srcRegex.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw || raw.startsWith("data:")) continue
    try {
      const absolute = new URL(raw, baseUrl.origin).href
      if (seen.has(absolute)) continue
      if (IMAGE_EXT.test(absolute) || absolute.includes("image") || !absolute.includes(".")) {
        seen.add(absolute)
        urls.push(absolute)
      }
    } catch {
      // ignore invalid URL
    }
  }

  // background-image: url(...)
  const bgRegex = /url\(["']?([^"')]+)["']?\)/gi
  while ((m = bgRegex.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw || raw.startsWith("data:")) continue
    try {
      const absolute = new URL(raw, baseUrl.origin).href
      if (seen.has(absolute)) continue
      if (IMAGE_EXT.test(absolute) || absolute.includes("image")) {
        seen.add(absolute)
        urls.push(absolute)
      }
    } catch {
      // ignore
    }
  }

  return urls.slice(0, MAX_IMAGES)
}

/**
 * 画像URLからバイナリを取得し、base64 と mimeType を返す
 */
export async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: new URL(imageUrl).origin + "/",
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const blob = await res.blob()
    const mimeType = blob.type || "image/jpeg"
    if (!mimeType.startsWith("image/")) return null
    const buf = Buffer.from(await blob.arrayBuffer())
    return { base64: buf.toString("base64"), mimeType }
  } catch {
    return null
  }
}
