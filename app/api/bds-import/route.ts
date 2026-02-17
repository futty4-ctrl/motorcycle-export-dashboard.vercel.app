import { NextRequest, NextResponse } from "next/server"

/** ブックマークレットから送られた直近のBDSページURL（メモリ保持・再起動で消える） */
let lastBdsUrl: string | null = null

/**
 * POST: 現在のBDSページURLを受け取る（ブックマークレットから呼ばれる）
 * Body: { url: string }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }

  try {
    const body = await request.json()
    const url = typeof body?.url === "string" ? body.url.trim() : null
    if (!url) {
      return NextResponse.json(
        { ok: false, error: "url が必要です" },
        { status: 400, headers: corsHeaders }
      )
    }
    lastBdsUrl = url
    return NextResponse.json({ ok: true, url: lastBdsUrl }, { headers: corsHeaders })
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエストの解析に失敗しました" },
      { status: 400, headers: corsHeaders }
    )
  }
}

/**
 * GET: 直近で受け取ったBDS URLを返す（車両ページで「このURLから取り込む」用）
 */
export async function GET() {
  return NextResponse.json({ url: lastBdsUrl })
}

/**
 * ブックマークレットが別オリジンから fetch するため OPTIONS で CORS を許可
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  })
}
