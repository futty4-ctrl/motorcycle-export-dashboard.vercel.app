import { Gavel, Package, TrendingUp } from "lucide-react"
import { summaryData as fallbackSummary } from "@/lib/data"
import type { SummaryData } from "@/app/actions/vehicles"

function formatJPY(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value)
}

type SummaryCardsProps = {
  /** スプレッドシートから取得したサマリー。未指定時はフォールバックデータを使用 */
  summary?: SummaryData | null
}

export function SummaryCards({ summary: summaryProp }: SummaryCardsProps) {
  const summary = summaryProp ?? fallbackSummary

  const cards = [
    {
      label: "入札中",
      value: summary.activeBids.toString(),
      change: "+3 本日",
      icon: Gavel,
      iconBg: "bg-primary/15 text-primary",
    },
    {
      label: "在庫数",
      value: summary.inventoryCount.toString(),
      change: "8件 保留中",
      icon: Package,
      iconBg: "bg-accent/15 text-accent",
    },
    {
      label: "月間利益",
      value: formatJPY(summary.monthlyProfit),
      change: `$${summary.monthlyProfitUSD.toLocaleString()} USD`,
      icon: TrendingUp,
      iconBg: "bg-chart-1/15 text-chart-1",
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-3 lg:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-card p-4 sm:p-3 lg:p-5"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-muted-foreground sm:text-xs lg:text-sm">
                {card.label}
              </p>
              <p className="mt-1.5 truncate text-xl font-bold text-card-foreground sm:mt-1 sm:text-lg lg:text-2xl">
                {card.value}
              </p>
            </div>
            <div
              className={`hidden shrink-0 items-center justify-center rounded-lg p-2 sm:flex ${card.iconBg}`}
            >
              <card.icon className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
          </div>
          <p className="mt-1.5 truncate text-sm text-muted-foreground sm:mt-1 sm:text-xs lg:mt-2">
            {card.change}
          </p>
        </div>
      ))}
    </div>
  )
}
