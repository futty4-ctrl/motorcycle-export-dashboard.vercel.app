import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { MarketPricesContent } from "@/components/market-prices-content"

export default function MarketPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              ダッシュボードへ
            </Link>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              BDS・ヤフオク 相場比較
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              車種・型式ごとに BDS とヤフオクの落札相場を手入力して比較。仕入れ判断の参考にしてください。
            </p>
            <MarketPricesContent />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
