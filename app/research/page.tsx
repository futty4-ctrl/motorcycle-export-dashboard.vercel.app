import ResearchContent from "@/components/research-content"
import { DeprecatedBanner } from "@/components/deprecated-banner"

export default function ResearchPage() {
  return (
    <>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <DeprecatedBanner
          newPageHref="/bidding"
          newPageLabel="入札判断を開く"
          reason="相場リサーチは /bidding の相場取得機能に統合されました（状態タグ・⚠要確認・×除外つき）"
        />
      </div>
      <ResearchContent />
    </>
  )
}
