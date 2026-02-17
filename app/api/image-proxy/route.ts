import { NextRequest, NextResponse } from "next/server"

/** プロキシを許可するホスト（BDS・Supabase など）。ホットリンクでブロックされる外部画像用 */
const ALLOWED_HOSTS = [
  "bdsc.jupiter.ac",
  "jupiter.ac",
  "supabase.co",
  "bds.co.jp",
  "bds-service.jp",
  "bds-net.co.jp",
]

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== "https:" && u.protocol !== "http:") return false
    const host = u.hostname.toLowerCase()
    return ALLOWED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith("." + allowed)
    )
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  if (!url || !isAllowedUrl(url)) {
    return new NextResponse("Invalid or disallowed URL", { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*",
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return new NextResponse(`Upstream returned ${res.status}`, {
        status: res.status,
      })
    }
    const contentType = res.headers.get("content-type") || "image/jpeg"
    const blob = await res.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch (err) {
    console.error("[image-proxy]", err)
    return new NextResponse("Failed to fetch image", { status: 502 })
  }
}
