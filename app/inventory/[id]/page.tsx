import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DesktopSidebar } from "@/components/desktop-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { InventoryDetailContent } from "@/components/inventory-detail-content"

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="mx-auto max-w-2xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Link
              href="/inventory"
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4" />
              在庫一覧へ
            </Link>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              {id}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              車体詳細・写真・QRコード
            </p>
            <div className="mt-6">
              <InventoryDetailContent managementCode={id} />
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
