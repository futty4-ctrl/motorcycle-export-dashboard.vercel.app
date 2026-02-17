import Link from "next/link"
import { ChevronLeft, ShoppingBag } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DesktopSidebar } from "@/components/desktop-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function EbayPage() {
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
              eBay出品
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              eBay への出品管理は準備中です。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm font-medium text-foreground">準備中</p>
              <p className="mt-1 text-sm text-muted-foreground">
                しばらくお待ちください
              </p>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
