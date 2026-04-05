import { Suspense } from "react"
import BdsBorderContent from "@/components/bds-border-content"
import { DeprecatedBanner } from "@/components/deprecated-banner"

export default function BdsBorderPage() {
  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <DeprecatedBanner
          newPageHref="/bidding"
          newPageLabel="入札判断を開く"
          reason="入札上限の計算は /bidding に統合されました（DB自動算出・相場取得・GO/NO GO判定つき）"
        />
      </div>
      <Suspense>
        <BdsBorderContent />
      </Suspense>
    </>
  )
}
