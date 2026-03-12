import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { BdsSimulatorContent } from "@/components/bds-simulator-content"

export default function BdsSimulatorPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="mx-auto min-w-0 max-w-2xl flex-1 px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4" />
              ダッシュボードへ
            </Link>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              BDS入札上限シミュレーター
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ヤフオク相場・整備代・希望利益から入札上限額を計算。現場で片手で入力しやすいモバイル対応です。
            </p>
            <div className="mt-6">
              <BdsSimulatorContent />
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
