import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DesktopSidebar } from "@/components/desktop-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { InventoryContent } from "@/components/inventory-content"

export default function InventoryPage() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
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
              在庫管理
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              車両のステータスとパーツ在庫を一覧で確認できます。車両詳細でパーツ追加・ステータス変更と連動しています。
            </p>
            <InventoryContent />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
