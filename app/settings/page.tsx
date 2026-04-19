import { SettingsForm } from "@/components/settings-form"
import { KobutsuSettingsContent } from "@/components/kobutsu-settings-content"

export default function SettingsPage() {
  return (
    <>
      <SettingsForm />
      <div id="kobutsu" style={{ scrollMarginTop: 64 }}>
        <KobutsuSettingsContent />
      </div>
    </>
  )
}
