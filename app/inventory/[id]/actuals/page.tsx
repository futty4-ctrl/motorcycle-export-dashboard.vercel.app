import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import InventoryActualsEditor from "@/components/inventory-actuals-editor"

export default async function InventoryActualsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="mx-auto max-w-2xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Link
              href={`/inventory/${id}`}
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4" />
              在庫詳細へ
            </Link>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              {id} — 出品実績・売却結果
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              写真枚数・動画・ウォッチ数・入札数・売却結果を記録
            </p>
            <div className="mt-6">
              <InventoryActualsEditor managementCode={id} />
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
