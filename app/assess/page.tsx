import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { AssessContent } from "@/components/assess-content"

export default function AssessPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="mx-auto min-w-0 max-w-5xl flex-1 px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4" />
              ダッシュボードへ
            </Link>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              BDS 個票査定
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              BDS個票のスクショを貼ると、AI（Claude）が車両情報・収支・判定を解析します。結果をSupabaseに保存できます。
            </p>
            <div className="mt-8">
              <AssessContent />
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
