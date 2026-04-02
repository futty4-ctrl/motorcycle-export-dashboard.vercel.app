"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { KobutsuSettings } from "@/types/kobutsu"
import { getSettings, saveSettings, uploadLicenseImage } from "@/lib/kobutsu"
import {
  C,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  inp,
  btn,
  lbl,
} from "@/components/ui-system"

export function KobutsuSettingsContent() {
  const [settings, setSettings] = useState<KobutsuSettings | null>(null)
  const [form, setForm] = useState({
    shop_name: "",
    owner_name: "",
    address: "",
    tel: "",
    license_number: "",
    public_safety_commission: "大阪府公安委員会",
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const { data } = await getSettings()
    if (data) {
      setSettings(data)
      setForm({
        shop_name: data.shop_name || "",
        owner_name: data.owner_name || "",
        address: data.address || "",
        tel: data.tel || "",
        license_number: data.license_number || "",
        public_safety_commission: data.public_safety_commission || "大阪府公安委員会",
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const { data, error } = await saveSettings(settings?.id || null, form)
    if (error) {
      setMessage("保存に失敗しました: " + error.message)
    } else {
      setSettings(data)
      setMessage("保存しました")
    }
    setSaving(false)
    setTimeout(() => setMessage(""), 3000)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const { url, error } = await uploadLicenseImage(file)
    if (error || !url) {
      setMessage("アップロードに失敗しました")
      setUploading(false)
      return
    }

    // URLを設定に保存
    const { data, error: saveErr } = await saveSettings(settings?.id || null, {
      ...form,
      license_image_url: url,
    })
    if (saveErr) {
      setMessage("画像URLの保存に失敗しました")
    } else {
      setSettings(data)
      setMessage("許可証画像をアップロードしました")
    }
    setUploading(false)
    setTimeout(() => setMessage(""), 3000)
  }

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div style={pageWrapper}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <Link
          href="/kobutsu"
          style={{
            color: C.textSub,
            textDecoration: "none",
            fontSize: 13,
          }}
        >
          ← 古物台帳に戻る
        </Link>
      </div>
      <h1 style={pageTitle}>古物商設定</h1>
      <p style={pageSub}>販売証明書に記載する販売店・古物商許可情報</p>

      {message && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 6,
            background: message.includes("失敗") ? `${C.red}18` : `${C.green}18`,
            color: message.includes("失敗") ? C.red : C.green,
            fontSize: 13,
            marginBottom: 16,
            border: `1px solid ${message.includes("失敗") ? `${C.red}40` : `${C.green}40`}`,
          }}
        >
          {message}
        </div>
      )}

      <div style={card()}>
        <SectionTitle>販売店情報</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="販売店名（屋号）">
            <input
              style={inp}
              value={form.shop_name}
              onChange={(e) => setField("shop_name", e.target.value)}
              placeholder="山上"
            />
          </Field>
          <Field label="古物商許可者名">
            <input
              style={inp}
              value={form.owner_name}
              onChange={(e) => setField("owner_name", e.target.value)}
              placeholder="山田 修"
            />
          </Field>
          <Field label="住所">
            <input
              style={inp}
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </Field>
          <Field label="電話番号">
            <input
              style={inp}
              value={form.tel}
              onChange={(e) => setField("tel", e.target.value)}
              placeholder="080-xxxx-xxxx"
            />
          </Field>
        </div>

        <SectionTitle>古物商許可情報</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Field label="古物商許可番号">
            <input
              style={inp}
              value={form.license_number}
              onChange={(e) => setField("license_number", e.target.value)}
              placeholder="第○○○○○○○○○○○○号"
            />
          </Field>
          <Field label="公安委員会名">
            <input
              style={inp}
              value={form.public_safety_commission}
              onChange={(e) => setField("public_safety_commission", e.target.value)}
              placeholder="大阪府公安委員会"
            />
          </Field>
        </div>

        <SectionTitle>古物商許可証の画像</SectionTitle>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
            販売証明書の2ページ目に自動添付されます（JPG/PNG/PDF対応）
          </p>

          {settings?.license_image_url ? (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 12,
                  background: C.bg,
                  display: "inline-block",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.license_image_url}
                  alt="古物商許可証"
                  style={{ maxWidth: 300, maxHeight: 200, objectFit: "contain" }}
                />
              </div>
              <p style={{ fontSize: 11, color: C.green, marginTop: 6 }}>
                アップロード済み
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: C.yellow, marginBottom: 12 }}>
              未登録 — 販売証明書に「※古物商許可証の写しを別途添付してください」と表示されます
            </p>
          )}

          <label
            style={{
              ...btn("ghost"),
              display: "inline-block",
              cursor: "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "アップロード中..." : "画像を選択"}
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...btn("primary"), opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "保存中..." : "設定を保存"}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ ...card(), marginTop: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: "bold", color: C.text, marginBottom: 12 }}>
          販売証明書での表示プレビュー
        </h3>
        <div
          style={{
            background: "#fff",
            color: "#000",
            padding: 24,
            borderRadius: 6,
            fontFamily: "'Yu Mincho', 'Hiragino Mincho ProN', serif",
            fontSize: 13,
            lineHeight: 2,
            textAlign: "right",
          }}
        >
          <div>販売店名：{form.shop_name || "（未設定）"}</div>
          <div>住所：{form.address || "（未設定）"}</div>
          <div>TEL：{form.tel || "（未設定）"}</div>
          <div>氏名：{form.owner_name || "（未設定）"}</div>
          <div>古物商許可番号：第{form.license_number || "○○○○○○○○○○○○"}号</div>
          <div>{form.public_safety_commission || "○○公安委員会"}</div>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: "bold",
        color: C.orange,
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 6,
        marginBottom: 12,
        letterSpacing: 1,
      }}
    >
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={lbl}>{label}</div>
      {children}
    </div>
  )
}
