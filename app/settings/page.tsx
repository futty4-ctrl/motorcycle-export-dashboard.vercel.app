import Link from "next/link"
import { SettingsForm } from "@/components/settings-form"
import { KobutsuSettingsContent } from "@/components/kobutsu-settings-content"

export default function SettingsPage() {
  return (
    <>
      <SettingsForm />
      <div
        style={{
          padding: "0 40px",
          maxWidth: 960,
        }}
      >
        <Link
          href="/settings/bike-types"
          style={{
            display: "block",
            background: "#111113",
            border: "1px solid #1e1e22",
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
            color: "#e8e8ec",
            textDecoration: "none",
            fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 4 }}>
            型式マスター →
          </div>
          <div style={{ fontSize: 11, color: "#9999a8" }}>
            型式コード（SE44J等）の登録・編集。auction_history から未登録分を自動抽出。
          </div>
        </Link>
      </div>
      <div id="kobutsu" style={{ scrollMarginTop: 64 }}>
        <KobutsuSettingsContent />
      </div>
    </>
  )
}
