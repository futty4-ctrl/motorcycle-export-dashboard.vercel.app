import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SettingsForm } from "@/components/settings-form"

export default function SettingsPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
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
              設定
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              陸送費・手数料など利益計算のデフォルト値と為替フォールバックを変更できます。
            </p>
            <Link
              href="/setup"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              はじめての使い方（環境変数・Supabase の設定）
            </Link>
            <SettingsForm />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
