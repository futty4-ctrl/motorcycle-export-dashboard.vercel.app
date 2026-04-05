import { AnalyticsCharts } from "@/components/analytics-charts"
import { DeprecatedBanner } from "@/components/deprecated-banner"

export default function AnalyticsPage() {
  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <DeprecatedBanner
          newPageHref="/bidding-analytics"
          newPageLabel="振り返り分析を開く"
          reason="予想 vs 実績は /bidding-analytics に発展統合されました（車種別利益・動画効果・曜日別）"
        />
      </div>
      <AnalyticsCharts />
    </>
  )
}
