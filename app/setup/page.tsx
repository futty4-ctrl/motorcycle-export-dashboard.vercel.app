import Link from "next/link"
import { ChevronLeft, Terminal, Key, Play, CheckCircle2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DesktopSidebar } from "@/components/desktop-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function SetupPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto min-w-0 max-w-3xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              ダッシュボードへ
            </Link>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              はじめて使うときの手順
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              環境変数や Supabase の設定方法をアプリ内で確認できます。
            </p>

            <div className="mt-6 space-y-8">
              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Terminal className="h-5 w-5" />
                  1. 依存関係を入れる
                </h2>
                <pre className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm font-mono text-foreground">
                  npm install
                </pre>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Key className="h-5 w-5" />
                  2. 環境変数を用意する
                </h2>
                <pre className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm font-mono text-foreground">
                  cp .env.example .env.local
                </pre>
                <p className="mt-3 text-sm text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">.env.local</code> を開き、必要な値を入れます。
                </p>

                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="text-sm font-medium text-foreground">パターンA: まず画面だけ見たい</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      何も書かなくても起動できます。サマリーのサンプル数値と空の車両一覧が表示されます。
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-sm font-medium text-foreground">パターンB: 車両データを表示したい</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      <li>
                        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Supabase
                        </a>
                        {" "}でアカウント作成 → 新規プロジェクト作成
                      </li>
                      <li>プロジェクトの <strong>Settings → API</strong> を開く</li>
                      <li>
                        <strong>Project URL</strong> → <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL=</code>
                      </li>
                      <li>
                        <strong>service_role</strong> のキー → <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY=</code>
                      </li>
                      <li>プロジェクト直下で <code className="rounded bg-muted px-1">npx supabase db push</code> でテーブル作成</li>
                    </ul>
                    <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-sm font-medium text-foreground">Vercel でデプロイしている場合</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        .env.local は Vercel に送られません。Vercel のプロジェクト → <strong>Settings → Environment Variables</strong> に
                        <code className="mx-1 rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> と
                        <code className="mx-1 rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code> を追加（.env.local と同じ値）し、
                        <strong>Deployments → Redeploy</strong> を実行してください。
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-sm font-medium text-foreground">パターンC: 写真解析・査定（AI）も試したい</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      <li>
                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Google AI Studio
                        </a>
                        {" "}で API キーを発行
                      </li>
                      <li>
                        <code className="rounded bg-muted px-1">GOOGLE_GEMINI_API_KEY=あなたのキー</code> を .env.local に追加
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Play className="h-5 w-5" />
                  3. 起動する
                </h2>
                <pre className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm font-mono text-foreground">
                  npm run dev
                </pre>
                <p className="mt-3 text-sm text-muted-foreground">
                  ブラウザで <strong>http://localhost:3000</strong> を開きます。
                </p>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                  4. 起動後にできること
                </h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 pr-2 font-medium text-foreground">やること</th>
                        <th className="py-2 font-medium text-foreground">必要な設定</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border">
                        <td className="py-2 pr-2">ダッシュボード・設定画面を見る</td>
                        <td className="py-2">なし</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-2 pr-2">車両一覧を表示・追加・ステータス変更</td>
                        <td className="py-2">Supabase</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-2 pr-2">スプレッドシートで車両・サマリー表示</td>
                        <td className="py-2">Supabase + スプレッドシート + サービスアカウント</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-2 pr-2">写真解析・BDS査定・利益シミュ</td>
                        <td className="py-2">Supabase + Gemini API（+ Drive で写真）</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-2">古物台帳へ1行追加</td>
                        <td className="py-2">Supabase + スプレッドシート（落札時に代金・相手方入力）</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
