import { NextResponse } from "next/server"

/**
 * 環境変数がサーバーに読まれているかだけ確認する（値は返さない）。
 * ブラウザで /api/env-check を開いて、「未設定」なのに .env.local に書いている場合の診断用。
 */
export async function GET() {
  const nextPublicSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const supabaseOk = nextPublicSupabaseUrl && supabaseServiceRoleKey

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: nextPublicSupabaseUrl ? "設定あり" : "未設定",
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey ? "設定あり" : "未設定",
    supabaseOk,
    message: supabaseOk
      ? "環境変数は読めています。まだエラーなら Supabase のテーブル作成（マイグレーション）やプロジェクトの一時停止を確認してください。"
      : "環境変数が読めていません。.env.local をプロジェクト直下に置き、npm run dev を再起動してください。",
  })
}
