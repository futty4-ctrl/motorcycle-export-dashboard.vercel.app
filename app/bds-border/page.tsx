import { Suspense } from "react"
import BdsBorderContent from "@/components/bds-border-content"

export default function BdsBorderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#a3a3a3" }}>読み込み中...</div>}>
      <BdsBorderContent />
    </Suspense>
  )
}
