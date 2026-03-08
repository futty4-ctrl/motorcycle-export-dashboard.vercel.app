import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getVehicleById, getEvaluationsByVehicleId, getScenariosByVehicleId, getPartsByVehicleId } from "@/app/actions/vehicles"
import { VehicleDetailContent } from "@/components/vehicle-detail-content"
import { DashboardHeader } from "@/components/dashboard-header"
import { DesktopSidebar } from "@/components/desktop-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const res = await getVehicleById(id)
  if (!res.success || !res.vehicle) notFound()

  const isSupabase = res.source === "supabase"
  const [evaluationsRes, scenariosRes, partsRes] = isSupabase
    ? await Promise.all([
        getEvaluationsByVehicleId(id),
        getScenariosByVehicleId(id),
        getPartsByVehicleId(id),
      ])
    : [
        { success: true, evaluations: [] },
        { success: true, scenarios: [] },
        { success: true, parts: [] },
      ]

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="mx-auto max-w-3xl px-4 py-5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              ダッシュボードへ
            </Link>
            <VehicleDetailContent
              vehicle={res.vehicle}
              source={res.source ?? "sheets"}
              evaluations={evaluationsRes.success ? evaluationsRes.evaluations : []}
              scenarios={scenariosRes.success ? scenariosRes.scenarios : []}
              parts={partsRes.success ? partsRes.parts : []}
            />
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
