import { Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardContent } from "@/components/dashboard-content"
import { FloatingActionButton } from "@/components/floating-action-button"
import { DesktopSidebar } from "@/components/desktop-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { YahooAuctionsMonitor } from "@/components/yahoo-auctions-monitor"
import { Loader2 } from "lucide-react"

export default function Page() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DesktopSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader />

        <main className="flex flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto min-w-0 max-w-3xl flex-1 px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <div className="mb-2 sm:mb-1">
              <h1 className="text-xl font-bold text-foreground sm:text-lg lg:text-xl">
                ダッシュボード
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-0 sm:text-xs lg:text-sm">
                2026年2月13日 &middot; 東京オークション週間
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">車両データを読み込み中…</p>
                  </div>
                </div>
              }
            >
              <DashboardContent />
            </Suspense>
          </div>
        </main>
      </div>

      <YahooAuctionsMonitor />
      <FloatingActionButton />
      <MobileBottomNav />
    </div>
  )
}
