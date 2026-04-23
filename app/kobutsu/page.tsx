import { Suspense } from "react"
import { KobutsuContent } from "@/components/kobutsu-content"

export default function KobutsuPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#a3a3a3" }}>読み込み中...</div>}>
      <KobutsuContent />
    </Suspense>
  )
}
