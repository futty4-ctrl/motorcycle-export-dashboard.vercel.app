import { BdsSimulatorContent } from "@/components/bds-simulator-content"
import { DeprecatedBanner } from "@/components/deprecated-banner"

export default function BdsSimulatorPage() {
  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <DeprecatedBanner
          newPageHref="/bidding"
          newPageLabel="入札判断を開く"
          reason="BDSシミュレーターは /bidding に統合されました（DB保存・相場取得・状態タグ付き）"
        />
      </div>
      <BdsSimulatorContent />
    </>
  )
}
