import { Suspense } from "react"
import { YahooTemplateContent } from "@/components/yahoo-template-content"

export default function YahooTemplatePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#666" }}>読み込み中...</div>}>
      <YahooTemplateContent />
    </Suspense>
  )
}
