"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import {
  fetchInventoryItems,
  insertInventoryItem,
  updateInventoryItemStatus,
  type InventoryItemRow,
} from "@/lib/inventory-supabase"
import {
  updateInventoryActuals,
  bulkUpdateActualsByManagementCode,
} from "@/app/actions/inventory-actuals"
import { toast } from "sonner"
import {
  C,
  font,
  pageWrapper,
  pageTitle,
  pageSub,
  card,
  kpiCard,
  lbl,
  inp,
  btn,
  badge,
  table,
  th,
  td,
} from "@/components/ui-system"

/* ── 定数 ── */
const STATUSES = ["未処理", "出品準備中", "ヤフオク出品中", "売約済み"] as const
const CATEGORIES = ["車体", "パーツ"] as const
const MAKERS = ["ホンダ", "ヤマハ", "スズキ", "カワサキ", "その他"] as const
const VENUES = ["大阪", "関東", "九州"] as const
const CC_RANGES = ["50cc", "90cc", "125cc", "250cc", "400cc", "750cc以上"] as const
const SC: Record<string, string> = {
  未処理: C.yellow,
  出品準備中: C.blue,
  "ヤフオク出品中": C.orange,
  売約済み: C.green,
}
const fmt = (n: number | null) =>
  n != null ? `¥${n.toLocaleString()}` : "—"
const getDisplayName = (item: InventoryItemRow) => {
  const parts = [item.maker, item.model_name, item.model_type].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : "（未入力）"
}

/* ── 型式→メーカー・車種マッピング（よく出る型式） ── */
const MODEL_MAP: Record<string, { maker: string; model: string; cc: string }> = {
  "CF4MA": { maker: "スズキ", model: "アドレスV125S", cc: "125cc" },
  "CF46A": { maker: "スズキ", model: "アドレスV125G", cc: "125cc" },
  "CF4EA": { maker: "スズキ", model: "アドレスV125SS", cc: "125cc" },
  "SED7J": { maker: "ヤマハ", model: "アクシスZ125", cc: "125cc" },
  "SEA5J": { maker: "ヤマハ", model: "NMAX125", cc: "125cc" },
  "SE86J": { maker: "ヤマハ", model: "シグナスX", cc: "125cc" },
  "JF81": { maker: "ホンダ", model: "PCX125", cc: "125cc" },
  "JK05": { maker: "ホンダ", model: "PCX125(4型)", cc: "125cc" },
  "JF84": { maker: "ホンダ", model: "リード125", cc: "125cc" },
  "JF45": { maker: "ホンダ", model: "Dio110", cc: "110cc" },
  "JA10": { maker: "ホンダ", model: "スーパーカブ110", cc: "110cc" },
  "JA07": { maker: "ホンダ", model: "スーパーカブ110", cc: "110cc" },
  "JA44": { maker: "ホンダ", model: "スーパーカブ125", cc: "125cc" },
  "AA09": { maker: "ホンダ", model: "スーパーカブ50", cc: "50cc" },
  "C50": { maker: "ホンダ", model: "スーパーカブ50", cc: "50cc" },
  "AB27": { maker: "ホンダ", model: "モンキー", cc: "50cc" },
  "AB28": { maker: "ホンダ", model: "ゴリラ", cc: "50cc" },
  "Z50J": { maker: "ホンダ", model: "モンキー", cc: "50cc" },
  "ST50": { maker: "ホンダ", model: "ダックス", cc: "50cc" },
  "CF50": { maker: "ホンダ", model: "シャリー", cc: "50cc" },
  "MC41": { maker: "ホンダ", model: "CB400SF", cc: "400cc" },
  "NC42": { maker: "ホンダ", model: "CB400SF REVO", cc: "400cc" },
  "MC22": { maker: "ホンダ", model: "CBR250RR", cc: "250cc" },
  "MC51": { maker: "ホンダ", model: "CBR250RR(2017-)", cc: "250cc" },
  "MD38": { maker: "ホンダ", model: "CRF250L", cc: "250cc" },
  "MC49": { maker: "ホンダ", model: "CB250R", cc: "250cc" },
  "BA41A": { maker: "スズキ", model: "GSX250R", cc: "250cc" },
  "RG43J": { maker: "ヤマハ", model: "YZF-R25", cc: "250cc" },
  "B0G": { maker: "ヤマハ", model: "セロー250", cc: "250cc" },
  "DG31J": { maker: "ヤマハ", model: "セロー250(FI)", cc: "250cc" },
}

/* ── BDS請求書パーサー ── */
type ParsedVehicle = {
  chassis_number: string
  model_type: string
  purchase_price: number
  bds_fee: number
  maker: string
  model_name: string
  cc_range: string
}

function parseBdsInvoiceText(text: string): ParsedVehicle[] {
  const vehicles: ParsedVehicle[] = []
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    // 車台番号パターン: アルファベット＋数字、ハイフンあり
    const chassisMatch = lines[i].match(/^([A-Z][A-Z0-9]*-[\dA-Z*]+)$/)
    if (!chassisMatch) continue

    const chassis = chassisMatch[1]
    // 型式を車台番号から抽出（ハイフン前の部分）
    const modelType = chassis.split("-")[0]

    // 次の行が数字（カンマ区切り）なら落札価格
    let price = 0
    let fee = 0
    if (i + 1 < lines.length) {
      const priceStr = lines[i + 1].replace(/,/g, "")
      if (/^\d+$/.test(priceStr)) price = parseInt(priceStr)
    }
    if (i + 2 < lines.length) {
      const feeStr = lines[i + 2].replace(/,/g, "")
      if (/^\d+$/.test(feeStr)) fee = parseInt(feeStr)
    }

    if (price === 0) continue

    const mapped = MODEL_MAP[modelType]
    vehicles.push({
      chassis_number: chassis,
      model_type: modelType,
      purchase_price: price,
      bds_fee: fee,
      maker: mapped?.maker ?? "",
      model_name: mapped?.model ?? "",
      cc_range: mapped?.cc ?? "",
    })
  }
  return vehicles
}

/* ── ヤフオク出品テンプレ生成（在庫データから簡易版） ── */
function generateYahooTemplate(item: InventoryItemRow): string {
  const s = "━━━━━━━━━━━━━━━━━━━━\n"
  let t = ""

  t += "ご覧いただきありがとうございます。\n\n"
  t += "乗り換えのため、出品いたします。\n"
  t += "自宅ガレージ（屋内）で保管しておりました。\n"
  t += "状態は写真と動画でご確認ください。\n\n"

  t += s + "■ 車両スペック\n" + s
  t += `メーカー　：${item.maker || "－"}\n`
  t += `車名　　　：${item.model_name || "－"}\n`
  t += `型式　　　：${item.model_type || "－"}\n`
  t += "年式　　　：－\n"
  t += "排気量　　：－\n"
  t += "走行距離　：－\n\n"

  t += s + "■ 車両の状態\n" + s
  t += "【エンジン・機関】\n"
  t += "始動確認済み。詳細は動画をご覧ください。\n\n"
  t += "【外装】\n"
  t += "年式相応の使用感があります。写真でご確認ください。\n\n"

  t += s + "■ 確認済み項目\n" + s
  t += "  エンジン始動確認済み\n"
  t += "  書類あり（名義変更可）\n"
  t += "  キー・メインスイッチ正常\n\n"

  t += s + "■ 動画で実車を確認できます\n" + s
  t += "エンジン始動の様子や各部の状態を撮影しています。\n"
  t += "ぜひご確認の上、ご入札をご検討ください。\n"
  t += '※ 動画準備中（<a href="https://youtu.be/" target="_blank" rel="noopener">YouTube</a>で公開予定）\n\n'

  t += s + "■ お取引について\n" + s
  t += "・1円スタートです\n"
  t += "・大阪府守口市からの出品です\n"
  t += "・引き渡し：現地引き取り、または陸送手配（落札者様にてお願いいたします）\n"
  t += "・落札後48時間以内のご連絡をお願いいたします\n"
  t += "・お支払い確認後、速やかにお引き渡しの段取りをいたします\n"
  t += "・名義変更は落札者様にてお願いいたします\n\n"

  t += s + "■ ご入札前に必ずお読みください\n" + s
  t += "・素人の判断ですので、見落としている箇所がある可能性があります\n"
  t += "・中古車にご理解のある方のみ、ご入札をお願いいたします\n"
  t += "・神経質な方はご入札をお控えください\n"
  t += "・現車確認も歓迎です。ご希望の方は入札前にご連絡ください\n"
  t += "・ノークレーム・ノーリターンでお願いいたします\n\n"

  t += "写真・動画をよくご確認の上、\n"
  t += "ご不明な点があればお気軽にご質問ください。\n"
  t += "気持ちの良いお取引ができるよう、誠実に対応いたします。\n"
  t += "よろしくお願いいたします。\n"
  return t
}

/* ── メインコンポーネント ── */
export function InventoryContent() {
  const [items, setItems] = useState<InventoryItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("すべて")
  const [tab, setTab] = useState<"list" | "quick" | "parts" | "bds" | "template" | "csv">("list")
  const [csvRows, setCsvRows] = useState<Array<{ management_code: string; sold_price: number | null; sold_date: string | null }>>([])
  const [csvFileName, setCsvFileName] = useState("")
  const [csvImporting, setCsvImporting] = useState(false)

  // クイック登録
  const [submitting, setSubmitting] = useState(false)
  const [createdItem, setCreatedItem] = useState<InventoryItemRow | null>(null)
  const qrContainerRef = useRef<HTMLDivElement>(null)
  const [maker, setMaker] = useState("ホンダ")
  const [modelName, setModelName] = useState("")
  const [modelType, setModelType] = useState("")
  const [chassisNumber, setChassisNumber] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [conditionMemo, setConditionMemo] = useState("")
  const [bdsVenue, setBdsVenue] = useState("大阪")
  const [ccRange, setCcRange] = useState("125cc")
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [showKobutsu, setShowKobutsu] = useState(false)
  const [sellerName, setSellerName] = useState("")
  const [sellerAge, setSellerAge] = useState("")
  const [sellerAddress, setSellerAddress] = useState("")
  const [sellerOccupation, setSellerOccupation] = useState("")
  const [idVerificationMethod, setIdVerificationMethod] = useState("")

  // BDSパーツ仕入れ
  const [partSubmitting, setPartSubmitting] = useState(false)
  const [partName, setPartName] = useState("")
  const [partCategory, setPartCategory] = useState("外装")
  const [partLocation, setPartLocation] = useState("")
  const [partVehicleModel, setPartVehicleModel] = useState("")
  const [partVehicleMaker, setPartVehicleMaker] = useState("")
  const [partPrice, setPartPrice] = useState("")
  const [partVenue, setPartVenue] = useState("大阪")
  const [partDate, setPartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [partNotes, setPartNotes] = useState("")

  // BDS取込
  const [bdsText, setBdsText] = useState("")
  const [parsedVehicles, setParsedVehicles] = useState<ParsedVehicle[]>([])
  const [bdsImporting, setBdsImporting] = useState(false)
  const [bdsVenueImport, setBdsVenueImport] = useState("大阪")

  // テンプレ表示
  const [templateItem, setTemplateItem] = useState<InventoryItemRow | null>(null)
  const [templateCopied, setTemplateCopied] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await fetchInventoryItems()
    if (err) {
      setError(err.message)
      setItems([])
    } else if (data) setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  function resetQuickForm() {
    setMaker("ホンダ")
    setModelName("")
    setModelType("")
    setChassisNumber("")
    setPurchasePrice("")
    setConditionMemo("")
    setBdsVenue("大阪")
    setCcRange("125cc")
    setPurchaseDate(new Date().toISOString().slice(0, 10))
    setShowKobutsu(false)
    setSellerName("")
    setSellerAge("")
    setSellerAddress("")
    setSellerOccupation("")
    setIdVerificationMethod("")
    setCreatedItem(null)
  }

  // 型式から自動入力
  function handleModelTypeChange(val: string) {
    setModelType(val)
    const mapped = MODEL_MAP[val.toUpperCase()]
    if (mapped) {
      setMaker(mapped.maker)
      setModelName(mapped.model)
      setCcRange(mapped.cc)
    }
  }

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { data, error: err } = await insertInventoryItem({
      purchase_date: purchaseDate,
      category: "車体",
      maker: maker.trim() || null,
      model_name: modelName.trim() || null,
      model_type: modelType.trim() || null,
      chassis_number: chassisNumber.trim() || null,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      condition_memo: conditionMemo.trim() || null,
      seller_name: sellerName.trim() || null,
      seller_age: sellerAge.trim() || null,
      seller_address: sellerAddress.trim() || null,
      seller_occupation: sellerOccupation.trim() || null,
      id_verification_method: idVerificationMethod.trim() || null,
      bds_venue: bdsVenue,
      cc_range: ccRange,
    })
    setSubmitting(false)
    if (err) { toast.error(err.message); return }
    if (data) {
      setCreatedItem(data)
      setItems((prev) => [data, ...prev])
      toast.success(`${data.management_code} を登録しました`)
    }
  }

  // BDS取込パース
  function handleBdsParse() {
    const vehicles = parseBdsInvoiceText(bdsText)
    if (vehicles.length === 0) {
      toast.error("車両データが見つかりません。請求書テキストを確認してください")
      return
    }
    setParsedVehicles(vehicles)
    toast.success(`${vehicles.length}台を検出しました`)
  }

  // PDF/テキストファイルをドロップで取込
  async function handleBdsFileDrop(file: File) {
    try {
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        const buf = await file.arrayBuffer()
        const pdf = await pdfjs.getDocument({ data: buf }).promise
        let text = ""
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items
            .map((it) => ("str" in it ? (it as { str: string }).str : ""))
            .join("\n") + "\n"
        }
        setBdsText(text)
        toast.success(`PDF読取完了: ${pdf.numPages}ページ`)
      } else {
        const text = await file.text()
        setBdsText(text)
        toast.success(`ファイル読取完了: ${file.name}`)
      }
    } catch (err) {
      toast.error(`読取失敗: ${(err as Error).message}`)
    }
  }

  // BDS取込の各行を編集
  function updateParsedVehicle(idx: number, field: keyof ParsedVehicle, val: string | number) {
    setParsedVehicles(prev => prev.map((v, i) => i === idx ? { ...v, [field]: val } : v))
  }

  // BDS一括登録
  async function handleBdsBulkImport() {
    if (parsedVehicles.length === 0) return
    setBdsImporting(true)
    let successCount = 0
    for (const v of parsedVehicles) {
      const { data, error: err } = await insertInventoryItem({
        purchase_date: new Date().toISOString().slice(0, 10),
        category: "車体",
        maker: v.maker || null,
        model_name: v.model_name || null,
        model_type: v.model_type || null,
        chassis_number: v.chassis_number || null,
        purchase_price: v.purchase_price,
        condition_memo: `BDS落札 / 手数料¥${v.bds_fee.toLocaleString()}`,
        bds_venue: bdsVenueImport,
        cc_range: v.cc_range || null,
      })
      if (!err && data) {
        successCount++
        setItems((prev) => [data, ...prev])
      }
    }
    setBdsImporting(false)
    toast.success(`${successCount}台を登録しました`)
    setParsedVehicles([])
    setBdsText("")
  }

  // テンプレコピー
  function handleTemplateCopy() {
    if (!templateItem) return
    const text = generateYahooTemplate(templateItem)
    navigator.clipboard.writeText(text).then(() => {
      setTemplateCopied(true)
      setTimeout(() => setTemplateCopied(false), 2000)
    })
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const { error: err } = await updateInventoryItemStatus(id, newStatus)
    if (err) { toast.error(err.message); return }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)))
    toast.success("ステータスを更新しました")
  }

  const filtered = statusFilter === "すべて"
    ? items : items.filter((i) => i.status === statusFilter)
  const counts = STATUSES.reduce(
    (a, s) => ({ ...a, [s]: items.filter((i) => i.status === s).length }),
    {} as Record<string, number>
  )
  const detailUrl =
    typeof window !== "undefined" && createdItem
      ? `${window.location.origin}/inventory/${createdItem.management_code}`
      : ""

  if (loading && items.length === 0)
    return <div style={{ ...pageWrapper, color: C.textMuted }}>読み込み中...</div>

  /* ── タブボタンスタイル ── */
  const tabBtn = (t2: typeof tab, label: string, icon: string) => ({
    padding: "10px 18px",
    borderRadius: "8px 8px 0 0",
    border: `1px solid ${tab === t2 ? C.orange : C.border}`,
    borderBottom: tab === t2 ? `2px solid ${C.orange}` : `1px solid ${C.border}`,
    background: tab === t2 ? `${C.orange}15` : "transparent",
    color: tab === t2 ? C.orange : C.textSub,
    cursor: "pointer" as const,
    fontSize: 13,
    fontWeight: tab === t2 ? 700 : 400,
    fontFamily: font,
    display: "flex",
    alignItems: "center" as const,
    gap: 6,
  })

  /* ── 選択ボタンスタイル ── */
  const selBtn = (active: boolean, color?: string) => ({
    padding: "6px 14px",
    borderRadius: 6,
    border: `1px solid ${active ? (color ?? C.orange) : C.border}`,
    background: active ? `${color ?? C.orange}15` : "transparent",
    color: active ? (color ?? C.orange) : C.textSub,
    cursor: "pointer" as const,
    fontSize: 12,
    fontFamily: font,
    fontWeight: active ? 600 : 400,
  })

  return (
    <div style={pageWrapper}>
      {/* ── ヘッダー ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          ...pageTitle,
          background: `linear-gradient(135deg, ${C.text} 60%, ${C.orange})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          在庫カルテ
        </div>
        <div style={pageSub}>在庫 & 古物台帳の統合管理 · {items.length}件</div>
      </div>

      {error && (
        <div style={{
          padding: 14, background: C.redGlow, border: `1px solid ${C.red}40`,
          borderRadius: 8, color: C.red, fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* ── KPIカード ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {STATUSES.map((s) => (
          <div key={s} style={{ ...kpiCard(SC[s]), cursor: "pointer" }} onClick={() => { setStatusFilter(s); setTab("list") }}>
            <div style={{ ...lbl, color: SC[s] }}>{s}</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: SC[s] }}>{counts[s] ?? 0}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>台</div>
          </div>
        ))}
      </div>

      {/* ── タブ ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: -1, position: "relative", zIndex: 1 }}>
        <button style={tabBtn("list", "在庫一覧", "▦")} onClick={() => setTab("list")}>▦ 在庫一覧</button>
        <button style={tabBtn("quick", "クイック登録", "+")} onClick={() => { setTab("quick"); resetQuickForm() }}>+ クイック登録</button>
        <button style={tabBtn("parts", "BDSパーツ仕入れ", "🔩")} onClick={() => setTab("parts")}>🔩 BDSパーツ</button>
        <button style={tabBtn("bds", "BDS請求書取込", "📄")} onClick={() => setTab("bds")}>📄 BDS取込</button>
        <button style={tabBtn("csv", "実績CSV一括更新", "📊")} onClick={() => setTab("csv")}>📊 実績CSV</button>
      </div>

      {/* ══════════ TAB: 在庫一覧 ══════════ */}
      {tab === "list" && (
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["すべて", ...STATUSES].map((st) => {
                const count = st === "すべて" ? items.length : (counts as Record<string, number>)[st] ?? 0
                return (
                  <button key={st} onClick={() => setStatusFilter(st)} style={selBtn(statusFilter === st, SC[st])}>
                    {st}
                    <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textMuted, padding: "24px 0", textAlign: "center" }}>
              データなし
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    {["管理番号", "車名", "仕入価格", "会場", "状態", "売却価格", "売却日", "操作"].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <ActualsRow
                      key={item.id}
                      item={item}
                      onStatusChange={handleStatusChange}
                      onSaved={(updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
                      onTemplate={() => { setTemplateItem(item); setTab("template") }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: クイック登録 ══════════ */}
      {tab === "quick" && !createdItem && (
        <div style={{ ...card(C.orangeGlow), borderTop: `3px solid ${C.orange}` }}>
          <div style={{ ...lbl, marginBottom: 16 }}>クイック登録 — 最低限の情報で素早く登録</div>
          <form onSubmit={handleQuickSubmit}>
            {/* 型式入力で自動判定 */}
            <div style={{
              background: `${C.orange}08`, border: `1px solid ${C.orange}30`, borderRadius: 8,
              padding: 16, marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: C.orange, marginBottom: 8, fontWeight: 700 }}>
                型式を入力すると車種を自動判定します
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...lbl, marginBottom: 4 }}>型式</label>
                  <input style={{ ...inp, borderColor: C.orange + "60", fontSize: 16 }}
                    value={modelType} onChange={(e) => handleModelTypeChange(e.target.value)}
                    placeholder="例: CF4MA, SED7J, AB27" />
                </div>
                <div style={{ fontSize: 13, color: C.textSub, paddingBottom: 10 }}>
                  →{" "}
                  {MODEL_MAP[modelType.toUpperCase()]
                    ? <span style={{ color: C.green, fontWeight: 700 }}>
                        {MODEL_MAP[modelType.toUpperCase()].maker} {MODEL_MAP[modelType.toUpperCase()].model}
                      </span>
                    : <span style={{ color: C.textMuted }}>手動入力</span>
                  }
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>メーカー</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {MAKERS.map((m) => (
                    <button key={m} type="button" onClick={() => setMaker(m)} style={selBtn(maker === m)}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>BDS会場</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {VENUES.map((v) => (
                    <button key={v} type="button" onClick={() => setBdsVenue(v)} style={selBtn(bdsVenue === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>車種名</label>
                <input style={inp} value={modelName} onChange={(e) => setModelName(e.target.value)}
                  placeholder="例: アドレスV125S" />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>排気量</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {CC_RANGES.map((c) => (
                    <button key={c} type="button" onClick={() => setCcRange(c)} style={selBtn(ccRange === c)}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>車台番号</label>
                <input style={inp} value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)}
                  placeholder="例: CF4MA-130842" />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>落札価格（円）</label>
                <input style={{ ...inp, fontSize: 16, fontWeight: "bold" }} type="number"
                  value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>仕入日</label>
                <input style={inp} type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>状態メモ</label>
                <input style={inp} value={conditionMemo} onChange={(e) => setConditionMemo(e.target.value)}
                  placeholder="例: 実働・外装キズあり" />
              </div>
            </div>

            {/* 古物台帳（折りたたみ） */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginBottom: 16 }}>
              <button type="button" onClick={() => setShowKobutsu(!showKobutsu)}
                style={{
                  background: "transparent", border: "none", color: C.textMuted,
                  cursor: "pointer", fontSize: 11, fontFamily: font, padding: 0,
                }}>
                {showKobutsu ? "▼" : "▶"} 古物台帳（売主情報）{!showKobutsu && " — クリックで展開"}
              </button>
              {showKobutsu && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  {[
                    { label: "売主氏名", val: sellerName, set: setSellerName, ph: "山田 太郎" },
                    { label: "年齢", val: sellerAge, set: setSellerAge, ph: "35" },
                    { label: "住所", val: sellerAddress, set: setSellerAddress, ph: "大阪府守口市..." },
                    { label: "職業", val: sellerOccupation, set: setSellerOccupation, ph: "会社員" },
                    { label: "本人確認方法", val: idVerificationMethod, set: setIdVerificationMethod, ph: "運転免許証" },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label}>
                      <label style={{ ...lbl, marginBottom: 4 }}>{label}</label>
                      <input style={inp} value={val} onChange={(e) => set(e.target.value)} placeholder={ph} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={submitting}
                style={{ ...btn("primary"), opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "登録中..." : "登録する"}
              </button>
              <button type="button" onClick={() => setTab("list")} style={btn("ghost")}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 登録完了 ── */}
      {tab === "quick" && createdItem && (
        <div style={{ ...card(C.greenGlow), borderTop: `4px solid ${C.green}` }}>
          <div style={{ ...lbl, color: C.green }}>登録完了</div>
          <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 16, color: C.green }}>
            {createdItem.management_code}
          </div>
          <div ref={qrContainerRef} style={{
            marginBottom: 16, padding: 12, background: "#fff",
            display: "inline-block", borderRadius: 6,
          }}>
            <QRCodeSVG value={detailUrl} size={100} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => {
              if (!detailUrl) return
              navigator.clipboard.writeText(detailUrl).then(() => toast.success("コピーしました"))
            }} style={btn("ghost")}>URLコピー</button>
            <button onClick={() => { resetQuickForm() }} style={btn("primary")}>
              続けて登録
            </button>
            <button onClick={() => { resetQuickForm(); setTab("list") }} style={btn("ghost")}>
              一覧に戻る
            </button>
          </div>
        </div>
      )}

      {/* ══════════ TAB: BDSパーツ仕入れ ══════════ */}
      {tab === "parts" && (
        <div style={{ ...card(C.greenGlow), borderTop: `3px solid ${C.green}` }}>
          <div style={{ ...lbl, marginBottom: 16 }}>
            BDSパーツ仕入れ — パーツ単位で直接登録（車両分解ではなく単体購入）
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!partName.trim()) {
                toast.error("パーツ名は必須")
                return
              }
              setPartSubmitting(true)
              const { data, error: err } = await insertInventoryItem({
                purchase_date: partDate,
                category: "パーツ",
                maker: partVehicleMaker.trim() || null,
                model_name: partVehicleModel.trim() || null,
                purchase_price: partPrice ? Number(partPrice) : null,
                bds_venue: partVenue,
                part_name: partName.trim(),
                part_category: partCategory,
                location: partLocation.trim() || null,
                notes: partNotes.trim() || null,
              })
              setPartSubmitting(false)
              if (err) {
                toast.error(err.message)
                return
              }
              if (data) {
                setItems((prev) => [data, ...prev])
                toast.success(`${data.management_code} を登録しました`)
                setPartName("")
                setPartLocation("")
                setPartPrice("")
                setPartNotes("")
              }
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>パーツ名 *</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={{ ...inp, flex: 1 }}
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="例: フロントフォーク"
                  />
                  <a
                    href={
                      partName.trim()
                        ? `https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodeURIComponent(
                            `${partVehicleModel} ${partName}`.trim()
                          )}&category=26316&n=50&b=1&exflg=1`
                        : undefined
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...btn("ghost"),
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      pointerEvents: partName.trim() ? "auto" : "none",
                      opacity: partName.trim() ? 1 : 0.4,
                    }}
                  >
                    🔍 ヤフオク相場
                  </a>
                </div>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>パーツ区分</label>
                <select
                  style={inp}
                  value={partCategory}
                  onChange={(e) => setPartCategory(e.target.value)}
                >
                  {["外装", "エンジン", "足回り", "電装", "その他"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>適合メーカー</label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {MAKERS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPartVehicleMaker(m)}
                      style={selBtn(partVehicleMaker === m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>適合車種</label>
                <input
                  style={inp}
                  value={partVehicleModel}
                  onChange={(e) => setPartVehicleModel(e.target.value)}
                  placeholder="例: シグナスX"
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>BDS会場</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {VENUES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPartVenue(v)}
                      style={selBtn(partVenue === v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>仕入価格（円）</label>
                <input
                  style={{ ...inp, fontSize: 16, fontWeight: "bold" }}
                  type="number"
                  value={partPrice}
                  onChange={(e) => setPartPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>仕入日</label>
                <input
                  style={inp}
                  type="date"
                  value={partDate}
                  onChange={(e) => setPartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>保管場所</label>
                <input
                  style={inp}
                  value={partLocation}
                  onChange={(e) => setPartLocation(e.target.value)}
                  placeholder="例: 倉庫A-3"
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...lbl, marginBottom: 4 }}>メモ</label>
              <input
                style={inp}
                value={partNotes}
                onChange={(e) => setPartNotes(e.target.value)}
                placeholder="状態・特記事項（任意）"
              />
            </div>
            <button
              type="submit"
              style={btn("primary")}
              disabled={partSubmitting}
            >
              {partSubmitting ? "登録中…" : "パーツを登録"}
            </button>
          </form>
        </div>
      )}

      {/* ══════════ TAB: BDS請求書取込 ══════════ */}
      {tab === "bds" && (
        <div style={{ ...card(C.blueGlow), borderTop: `3px solid ${C.blue}` }}>
          <div style={{ ...lbl, marginBottom: 16 }}>
            BDS請求書テキスト取込 — 請求書のテキストを貼り付けて一括登録
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ ...lbl, marginBottom: 4 }}>BDS会場</label>
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {VENUES.map((v) => (
                <button key={v} onClick={() => setBdsVenueImport(v)} style={selBtn(bdsVenueImport === v)}>{v}</button>
              ))}
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) handleBdsFileDrop(file)
              }}
              style={{
                position: "relative",
                borderRadius: 8,
                border: `2px dashed ${C.border}`,
                padding: 4,
              }}
            >
              <textarea
                style={{
                  ...inp, minHeight: 200, resize: "vertical", lineHeight: 1.6,
                  fontFamily: "'Courier New', monospace", fontSize: 12,
                  border: "none",
                }}
                value={bdsText}
                onChange={(e) => setBdsText(e.target.value)}
                placeholder={`BDS請求書をここにドラッグ&ドロップ（PDF対応）\n\nまたはテキストを貼り付け（Ctrl+A → Ctrl+C → Ctrl+V）\n\n自動的に車台番号・落札価格・手数料を抽出します。`}
              />
              <input
                type="file"
                accept=".pdf,.txt"
                style={{ display: "block", marginTop: 8, fontSize: 11, color: C.textSub }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleBdsFileDrop(f)
                  e.target.value = ""
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={handleBdsParse} style={btn("primary")} disabled={!bdsText.trim()}>
                解析する
              </button>
              <button onClick={() => { setBdsText(""); setParsedVehicles([]) }} style={btn("ghost")}>
                クリア
              </button>
            </div>
          </div>

          {/* パース結果プレビュー */}
          {parsedVehicles.length > 0 && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ ...lbl, color: C.green, marginBottom: 12 }}>
                {parsedVehicles.length}台を検出 — 内容を確認・修正してから登録してください
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={table}>
                  <thead>
                    <tr>
                      {["車台番号", "型式", "メーカー", "車種", "排気量", "落札額", "手数料"].map(h => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedVehicles.map((v, i) => (
                      <tr key={i}>
                        <td style={{ ...td, fontWeight: "bold", color: C.orange }}>{v.chassis_number}</td>
                        <td style={td}>{v.model_type}</td>
                        <td style={td}>
                          <input style={{ ...inp, padding: "4px 8px", width: 80 }} value={v.maker}
                            onChange={(e) => updateParsedVehicle(i, "maker", e.target.value)} />
                        </td>
                        <td style={td}>
                          <input style={{ ...inp, padding: "4px 8px", width: 140 }} value={v.model_name}
                            onChange={(e) => updateParsedVehicle(i, "model_name", e.target.value)} />
                        </td>
                        <td style={td}>
                          <input style={{ ...inp, padding: "4px 8px", width: 70 }} value={v.cc_range}
                            onChange={(e) => updateParsedVehicle(i, "cc_range", e.target.value)} />
                        </td>
                        <td style={{ ...td, fontWeight: "bold" }}>¥{v.purchase_price.toLocaleString()}</td>
                        <td style={{ ...td, color: C.textMuted }}>¥{v.bds_fee.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: 16, padding: "12px 16px",
                background: `${C.green}08`, border: `1px solid ${C.green}30`, borderRadius: 8,
              }}>
                <div style={{ fontSize: 14, fontWeight: "bold", color: C.green }}>
                  合計: ¥{parsedVehicles.reduce((s, v) => s + v.purchase_price, 0).toLocaleString()}
                  <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                    (手数料: ¥{parsedVehicles.reduce((s, v) => s + v.bds_fee, 0).toLocaleString()})
                  </span>
                </div>
                <button onClick={handleBdsBulkImport} disabled={bdsImporting}
                  style={{ ...btn("primary"), background: C.green, opacity: bdsImporting ? 0.6 : 1 }}>
                  {bdsImporting ? "登録中..." : `${parsedVehicles.length}台を一括登録`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: 実績CSV一括更新 ══════════ */}
      {tab === "csv" && (
        <div style={{ ...card(C.greenGlow), borderTop: `3px solid ${C.green}` }}>
          <div style={{ ...lbl, marginBottom: 16 }}>
            実績CSV一括更新 — 管理コード・売却価格・売却日をまとめて更新
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, lineHeight: 1.8 }}>
            CSV形式: <code style={{ background: C.surfaceHigh, padding: "2px 6px", borderRadius: 3 }}>管理コード,売却価格,売却日</code>
            <br />
            例: <code style={{ background: C.surfaceHigh, padding: "2px 6px", borderRadius: 3 }}>BDS-0001,380000,2026-04-15</code>
            <br />
            売却日は空欄OK。Excelから直接コピペもできます（カンマ/タブ両対応）
          </div>
          <textarea
            style={{
              ...inp, minHeight: 160, resize: "vertical", lineHeight: 1.6,
              fontFamily: "'Courier New', monospace", fontSize: 12,
            }}
            value={csvFileName}
            onChange={(e) => setCsvFileName(e.target.value)}
            placeholder={`BDS-0001,380000,2026-04-15\nBDS-0002,420000,2026-04-16\nBDS-0003,250000,`}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => {
                const lines = csvFileName.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
                const rows = lines.map((line) => {
                  const parts = line.split(/[,\t]/).map((p) => p.trim())
                  const code = parts[0] || ""
                  const priceStr = (parts[1] || "").replace(/[^\d]/g, "")
                  const dateStr = parts[2] || ""
                  return {
                    management_code: code,
                    sold_price: priceStr ? parseInt(priceStr, 10) : null,
                    sold_date: dateStr || null,
                  }
                }).filter((r) => r.management_code && r.sold_price != null)
                setCsvRows(rows)
                if (rows.length === 0) {
                  toast.error("有効な行がありません。形式を確認してください")
                } else {
                  toast.success(`${rows.length}行を検出`)
                }
              }}
              style={btn("primary")}
              disabled={!csvFileName.trim()}
            >
              解析
            </button>
            <button onClick={() => { setCsvFileName(""); setCsvRows([]) }} style={btn("ghost")}>
              クリア
            </button>
          </div>

          {csvRows.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ ...lbl, marginBottom: 8 }}>プレビュー（{csvRows.length}件）</div>
              <div style={{ overflowX: "auto", maxHeight: 300, marginBottom: 12 }}>
                <table style={table}>
                  <thead>
                    <tr>
                      {["管理コード", "売却価格", "売却日"].map((h) => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((r, i) => (
                      <tr key={i}>
                        <td style={td}>{r.management_code}</td>
                        <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{fmt(r.sold_price)}</td>
                        <td style={{ ...td, color: C.textSub }}>{r.sold_date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={async () => {
                  setCsvImporting(true)
                  const res = await bulkUpdateActualsByManagementCode(csvRows)
                  setCsvImporting(false)
                  if (res.errors.length > 0) {
                    toast.error(`${res.updated}件成功 / ${res.errors.length}件失敗`)
                    console.error("CSV update errors:", res.errors)
                  } else {
                    toast.success(`${res.updated}件を更新しました`)
                  }
                  setCsvFileName("")
                  setCsvRows([])
                  // 在庫リスト再取得
                  const refreshed = await fetchInventoryItems()
                  if (refreshed.data) setItems(refreshed.data)
                }}
                style={{ ...btn("primary"), background: C.green, borderColor: C.green }}
                disabled={csvImporting}
              >
                {csvImporting ? "更新中..." : `${csvRows.length}件を一括更新`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: 出品テンプレ生成 ══════════ */}
      {tab === "template" && templateItem && (
        <div style={{ ...card(), borderTop: `3px solid ${C.orange}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ ...lbl, marginBottom: 4 }}>出品テンプレート</div>
              <div style={{ fontSize: 14, fontWeight: "bold" }}>
                {getDisplayName(templateItem)}
                <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                  {templateItem.management_code}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleTemplateCopy}
                style={{ ...btn("primary"), background: templateCopied ? C.green : C.orange }}>
                {templateCopied ? "コピー完了" : "コピー"}
              </button>
              <Link href={`/yahoo-template`} style={{ ...btn("ghost"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                詳細テンプレへ
              </Link>
              <button onClick={() => setTab("list")} style={btn("ghost")}>
                戻る
              </button>
            </div>
          </div>
          <pre style={{
            background: "#0a0a0b", border: `1px solid ${C.border}`, borderRadius: 8,
            padding: 20, fontSize: 13, lineHeight: 2, whiteSpace: "pre-wrap",
            wordBreak: "break-word", color: C.text, maxHeight: 600, overflowY: "auto",
            margin: 0, fontFamily: "'Hiragino Sans','Yu Gothic','Meiryo',sans-serif",
          }}>
            {generateYahooTemplate(templateItem)}
          </pre>
          <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted }}>
            YouTube動画URL・詳細な状態記述・即決価格などは
            <Link href="/yahoo-template" style={{ color: C.orange, marginLeft: 4 }}>詳細テンプレページ</Link>
            で編集できます。
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 実績入力インライン行 ── */
function ActualsRow({
  item,
  onStatusChange,
  onSaved,
  onTemplate,
}: {
  item: InventoryItemRow
  onStatusChange: (id: string, newStatus: string) => void
  onSaved: (updated: InventoryItemRow) => void
  onTemplate: () => void
}) {
  const [price, setPrice] = useState(item.sold_price != null ? String(item.sold_price) : "")
  const [date, setDate] = useState(item.sold_date ? String(item.sold_date).slice(0, 10) : "")
  const [saving, setSaving] = useState(false)

  const canEdit = item.status === "売約済み"
  const isUnfilled = canEdit && item.sold_price == null

  const save = async () => {
    if (!price) {
      toast.error("売却価格を入力してください")
      return
    }
    setSaving(true)
    const numPrice = parseInt(price.replace(/,/g, ""), 10)
    const res = await updateInventoryActuals(item.id, {
      sold_price: numPrice,
      sold_date: date || null,
    })
    setSaving(false)
    if (res.success) {
      toast.success(`${item.management_code} 実績保存`)
      onSaved({ ...item, sold_price: numPrice, sold_date: date || null })
    } else {
      toast.error(res.error || "保存失敗")
    }
  }

  return (
    <tr
      style={{
        transition: "background 0.15s",
        background: isUnfilled ? `${C.yellow}08` : "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.surfaceHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = isUnfilled ? `${C.yellow}08` : "transparent")}
    >
      <td style={td}>
        <Link href={`/inventory/${item.management_code}`} style={{ color: C.orange, textDecoration: "none", fontWeight: "bold" }}>
          {item.management_code}
        </Link>
      </td>
      <td style={{ ...td, fontWeight: "bold" }}>
        <span>{getDisplayName(item)}</span>
        {(() => {
          const q = [
            item.maker,
            item.model_name,
            item.part_name,
          ]
            .filter(Boolean)
            .join(" ")
            .trim()
          if (!q) return null
          const isParts = item.category === "パーツ"
          const url = `https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodeURIComponent(q)}${
            isParts ? "" : "&category=26316"
          }&n=50&b=1&exflg=1`
          return (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title="ヤフオク落札相場を見る"
              style={{
                marginLeft: 6,
                fontSize: 10,
                color: C.textMuted,
                textDecoration: "none",
                padding: "1px 6px",
                border: `1px solid ${C.border}`,
                borderRadius: 4,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              🔍ヤフオク
            </a>
          )
        })()}
      </td>
      <td style={{ ...td, color: C.textSub }}>{fmt(item.purchase_price)}</td>
      <td style={td}>
        {item.bds_venue ? <span style={{ ...badge(C.blue), fontSize: 10 }}>{item.bds_venue}</span> : "—"}
      </td>
      <td style={td}>
        <select
          value={item.status}
          onChange={(e) => onStatusChange(item.id, e.target.value)}
          style={{
            background: `${SC[item.status] ?? C.border}15`,
            border: `1px solid ${SC[item.status] ?? C.border}40`,
            borderRadius: 4, color: SC[item.status] ?? C.textSub,
            padding: "4px 8px", fontSize: 12, cursor: "pointer", fontFamily: font, outline: "none",
          }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td style={td}>
        {canEdit ? (
          <input
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") save() }}
            placeholder="価格"
            style={{
              ...inp,
              width: 100,
              padding: "4px 8px",
              fontSize: 12,
              fontFamily: "monospace",
              borderColor: isUnfilled ? C.yellow : C.border,
            }}
          />
        ) : "—"}
      </td>
      <td style={td}>
        {canEdit ? (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save() }}
            style={{
              ...inp,
              width: 130,
              padding: "4px 8px",
              fontSize: 12,
            }}
          />
        ) : "—"}
      </td>
      <td style={td}>
        {canEdit ? (
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: `1px solid ${isUnfilled ? C.yellow : C.green}`,
              background: `${isUnfilled ? C.yellow : C.green}15`,
              color: isUnfilled ? C.yellow : C.green,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: font,
            }}
          >
            {saving ? "..." : isUnfilled ? "保存" : "更新"}
          </button>
        ) : (
          <button
            onClick={onTemplate}
            style={{
              padding: "4px 10px", borderRadius: 4, border: `1px solid ${C.border}`,
              background: "transparent", color: C.textSub, cursor: "pointer",
              fontSize: 11, fontFamily: font,
            }}
          >
            テンプレ生成
          </button>
        )}
      </td>
    </tr>
  )
}
