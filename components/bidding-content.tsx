"use client"

import { useState, useEffect, useCallback } from "react"
import {
  saveBiddingEvaluation,
  listBiddingEvaluations,
} from "@/app/actions/bidding"
import { getOwnMarketStats, type OwnMarketStats } from "@/app/actions/own-market-stats"
import { analyzeCondition, type ConditionAiResult } from "@/app/actions/condition-ai"
import { previewBidLimits } from "@/lib/bidding-calc"
import type {
  EvaluationRow,
  VehicleCategory,
  ConditionRank,
  BidDecision,
} from "@/lib/db/types"
import { MODEL_CODES, CC_RANGES, getCCRange } from "@/lib/model-codes"

const C = {
  surface: "#111111",
  surfaceHigh: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  orange: "#f97316",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  text: "#f5f5f5",
  textSub: "#a3a3a3",
  textMuted: "#525252",
  font: "'DM Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', 'Helvetica Neue', sans-serif",
}

const CATEGORIES: VehicleCategory[] = ["4ミニ", "ネイキッド", "オフ車", "その他"]
const RANKS: ConditionRank[] = ["A", "B", "C", "D"]

// タイトルから状態を推定するタグ
type ConditionTag = "美品" | "実動" | "要整備" | "不動/部品"

const CONDITION_KEYWORDS: { tag: ConditionTag; keywords: string[]; color: string }[] = [
  {
    tag: "不動/部品",
    keywords: ["不動", "部品取り", "部品どり", "ジャンク", "書無", "書類無", "書類なし", "フレームのみ"],
    color: "#ef4444",
  },
  {
    tag: "要整備",
    keywords: ["要整備", "レストア", "不調", "難あり", "訳あり", "訳アリ", "ワケあり", "現状"],
    color: "#eab308",
  },
  {
    tag: "美品",
    keywords: ["美品", "極上", "レストア済", "フルレストア", "新品", "ワンオーナー", "low km", "ローマイル"],
    color: "#22c55e",
  },
  {
    tag: "実動",
    keywords: ["実動", "始動確認", "始動ok", "走行ok", "エンジン好調", "調子良"],
    color: "#3b82f6",
  },
]

function detectConditionTag(title: string): ConditionTag | null {
  const lower = title.toLowerCase()
  // 優先順位: 不動 > 要整備 > 美品 > 実動
  for (const { tag, keywords } of CONDITION_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return tag
  }
  return null
}

const TAG_COLOR: Record<ConditionTag, string> = {
  "美品": "#22c55e",
  "実動": "#3b82f6",
  "要整備": "#eab308",
  "不動/部品": "#ef4444",
}

// 整備費の目安（状態ランクから提案）
const REPAIR_HINT: Record<ConditionRank, number> = {
  A: 0,
  B: 10000,
  C: 30000,
  D: 60000,
}

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : `¥${Math.round(n).toLocaleString()}`

/**
 * モデルラベルから車名の短縮形を抽出
 * 例: "モンキー50(Z50J)" → "モンキー" / "スーパーカブ110(JA07)" → "スーパーカブ"
 */
function getModelShortName(label: string): string {
  return label
    .replace(/\(.*?\)/g, "") // (Z50J) などを除去
    .replace(/\d+/g, "") // 数字を除去
    .trim()
}

const DEFAULT_EXCLUDE_PARTS =
  "部品 パーツ シート ホイール タンク フレーム フェンダー カウル マフラー ハンドル ミラー ステム カスタム 社外 外し 用 のみ"

type EvaluationWithVehicle = EvaluationRow & {
  vehicle?: {
    bds_rating: string | null
    chassis_number: string | null
    onsite_notes: string | null
  }
}

export default function BiddingContent() {
  const [category, setCategory] = useState<VehicleCategory>("4ミニ")
  const [rank, setRank] = useState<ConditionRank>("B")
  const [salePrice, setSalePrice] = useState<string>("")
  const [repairCost, setRepairCost] = useState<string>("10000")
  const [transportCost, setTransportCost] = useState<string>("20000")
  const [adCost, setAdCost] = useState<string>("700")
  const [targetProfit, setTargetProfit] = useState<string>("50000")
  const [salePriceSource, setSalePriceSource] = useState<string>("")
  const [onsiteNotes, setOnsiteNotes] = useState<string>("")
  const [bdsRating, setBdsRating] = useState<string>("")
  const [chassisNumber, setChassisNumber] = useState<string>("")

  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<EvaluationRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [evaluations, setEvaluations] = useState<EvaluationWithVehicle[]>([])
  const [loadingList, setLoadingList] = useState(true)

  // 相場取得
  const [modelIndex, setModelIndex] = useState<string>("")
  const [customQuery, setCustomQuery] = useState<string>("")
  const [modelFilter, setModelFilter] = useState<string>("")
  const [makerFilter, setMakerFilter] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [ccFilter, setCcFilter] = useState<string>("")
  // 検索結果から手動で除外したURL
  const [excludedUrls, setExcludedUrls] = useState<Set<string>>(new Set())
  // ソート順
  const [sortBy, setSortBy] = useState<"date" | "price_asc" | "price_desc" | "bids_desc">("date")
  // 自社実績
  const [ownStats, setOwnStats] = useState<OwnMarketStats | null>(null)
  // AI状態判定
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<ConditionAiResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [fetchingMarket, setFetchingMarket] = useState(false)
  const [marketStats, setMarketStats] = useState<{
    count: number
    avg: number
    trimmedAvg: number
    median: number
    min: number
    max: number
    range: { low: number; high: number }
  } | null>(null)
  const [marketResults, setMarketResults] = useState<
    { title: string; price: number; bids: number; endDate: string; url: string }[]
  >([])
  const [conditionFilter, setConditionFilter] = useState<ConditionTag | "ALL">("ALL")
  const [marketError, setMarketError] = useState<string | null>(null)

  // ランク変更時、整備費ヒントを提案
  useEffect(() => {
    setRepairCost(String(REPAIR_HINT[rank] ?? 0))
  }, [rank])

  const refresh = useCallback(async () => {
    setLoadingList(true)
    const res = await listBiddingEvaluations(50)
    if (res.success) setEvaluations(res.evaluations ?? [])
    setLoadingList(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // 選択中モデルから「他車種/他型式」のワード一覧を生成
  const selectedModel = modelIndex ? MODEL_CODES[Number(modelIndex)] : null
  const foreignWords: string[] = (() => {
    if (!selectedModel) return []
    const selfShort = getModelShortName(selectedModel.label)
    const selfKatashiki = selectedModel.katashiki.map((k) => k.toUpperCase())
    const words = new Set<string>()
    for (const m of MODEL_CODES) {
      const short = getModelShortName(m.label)
      // 自分の短縮名を含む/含まれる名前はスキップ（モンキー125 等を誤検知しないため）
      if (
        short &&
        short !== selfShort &&
        !selfShort.includes(short) &&
        !short.includes(selfShort)
      ) {
        words.add(short)
      }
      // 他型式
      for (const k of m.katashiki) {
        const ku = k.toUpperCase()
        if (!selfKatashiki.includes(ku)) words.add(ku)
      }
    }
    return Array.from(words)
  })()

  const detectMismatch = (title: string): string[] => {
    if (foreignWords.length === 0) return []
    const upper = title.toUpperCase()
    return foreignWords.filter((w) => {
      // 型式は単語境界を意識（数字を含むもの）
      if (/^[A-Z]+\d/.test(w)) return upper.includes(w)
      // 車名は素直に部分一致
      return title.includes(w)
    })
  }

  // 除外後の結果と統計を再計算
  const visibleResults = marketResults.filter((r) => !excludedUrls.has(r.url))
  const effectiveStats = (() => {
    if (visibleResults.length === 0) return null
    const prices = visibleResults.map((r) => r.price).sort((a, b) => a - b)
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    const median = prices[Math.floor(prices.length / 2)]
    const min = prices[0]
    const max = prices[prices.length - 1]
    const trimCount = Math.floor(prices.length * 0.1)
    const trimmed = prices.slice(trimCount, prices.length - trimCount)
    const trimmedAvg =
      trimmed.length > 0
        ? Math.round(trimmed.reduce((s, p) => s + p, 0) / trimmed.length)
        : avg
    return {
      count: prices.length,
      avg,
      trimmedAvg,
      median,
      min,
      max,
      range: {
        low: prices[Math.floor(prices.length * 0.25)],
        high: prices[Math.floor(prices.length * 0.75)],
      },
    }
  })()

  const toggleExcludeUrl = (url: string) => {
    setExcludedUrls((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  // モデル絞り込み
  const filteredModels = MODEL_CODES.map((model, originalIndex) => ({
    model,
    originalIndex,
  })).filter(({ model }) => {
    if (makerFilter && model.maker !== makerFilter) return false
    if (ccFilter && getCCRange(model.cc) !== ccFilter) return false
    if (categoryFilter) {
      // "オフ" は "オフ車"/"オフ" をカバー
      if (categoryFilter === "オフ") {
        if (!model.category.includes("オフ")) return false
      } else if (model.category !== categoryFilter) return false
    }
    if (modelFilter) {
      const q = modelFilter.toLowerCase()
      const hay = `${model.label} ${model.query} ${model.katashiki.join(" ")}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  // リアルタイム試算
  const saleN = Number(salePrice) || 0
  const repairN = Number(repairCost) || 0
  const transportN = Number(transportCost) || 20000
  const adN = Number(adCost) || 700
  const preview =
    saleN > 0
      ? previewBidLimits({
          estimated_sale_price: saleN,
          repair_cost_estimate: repairN,
          transport_cost: transportN,
          ad_cost: adN,
        })
      : null

  const handleSubmit = async () => {
    setError(null)
    setResult(null)
    if (!saleN) {
      setError("想定売価を入力してください")
      return
    }
    setSaving(true)
    const res = await saveBiddingEvaluation({
      vehicle_category: category,
      condition_rank: rank,
      estimated_sale_price: saleN,
      repair_cost_estimate: repairN,
      transport_cost: transportN,
      ad_cost: adN,
      target_profit: Number(targetProfit) || 50000,
      sale_price_source: salePriceSource || null,
      new_vehicle: {
        bds_rating: bdsRating || null,
        chassis_number: chassisNumber || null,
        onsite_notes: onsiteNotes || null,
      },
    })
    setSaving(false)
    if (res.success && res.evaluation) {
      setResult(res.evaluation)
      refresh()
    } else {
      setError(res.error ?? "保存に失敗しました")
    }
  }

  const handleFetchMarket = async () => {
    setMarketError(null)
    setMarketStats(null)
    const model = modelIndex ? MODEL_CODES[Number(modelIndex)] : null
    const query = customQuery.trim() || model?.query
    if (!query) {
      setMarketError("モデルを選択するかキーワードを入力してください")
      return
    }
    setFetchingMarket(true)
    setOwnStats(null)
    try {
      // 自社実績を並列取得
      if (model) {
        const shortName = getModelShortName(model.label)
        getOwnMarketStats({
          makerKeyword: model.maker,
          modelKeyword: shortName,
          katashiki: model.katashiki[0],
        }).then((res) => {
          if (res.success && res.stats) setOwnStats(res.stats)
        })
      }

      const res = await fetch(
        `/api/yahoo-auctions/closed?q=${encodeURIComponent(query)}&limit=50`
      )
      const json = (await res.json()) as {
        stats?: {
          count: number
          avg: number
          trimmedAvg: number
          median: number
          min: number
          max: number
          range: { low: number; high: number }
        } | null
        results?: {
          title: string
          price: number
          bids: number
          endDate: string
          url: string
        }[]
        error?: string
      }
      if (json.error) throw new Error(json.error)
      if (!json.stats || json.stats.count === 0) {
        setMarketError("落札データが見つかりませんでした")
        setMarketResults([])
      } else {
        setMarketStats(json.stats)
        setMarketResults(json.results ?? [])
        setConditionFilter("ALL")
        setExcludedUrls(new Set())
        // カテゴリを自動設定
        if (model) {
          if (model.category === "4mini") setCategory("4ミニ")
          else if (model.category === "オフ車" || model.category === "オフ")
            setCategory("オフ車")
          else setCategory("ネイキッド")
        }
      }
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "相場取得に失敗しました")
    } finally {
      setFetchingMarket(false)
    }
  }

  const applyMarketPrice = (price: number) => {
    setSalePrice(String(price))
  }

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setAnalyzing(true)
    setAiError(null)
    setAiResult(null)
    try {
      const images = await Promise.all(
        Array.from(files).map(
          (file) =>
            new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                const result = reader.result as string
                const base64 = result.split(",")[1] ?? ""
                resolve({ base64, mimeType: file.type })
              }
              reader.onerror = () => reject(new Error("ファイル読み込み失敗"))
              reader.readAsDataURL(file)
            })
        )
      )
      const res = await analyzeCondition(images)
      if (res.success && res.result) {
        setAiResult(res.result)
        // フォームに反映
        setRank(res.result.rank)
        setRepairCost(String(res.result.repairCostEstimate))
      } else {
        setAiError(res.error ?? "判定に失敗しました")
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "アップロードに失敗しました")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setSalePrice("")
    setRepairCost("10000")
    setSalePriceSource("")
    setOnsiteNotes("")
    setBdsRating("")
    setChassisNumber("")
    setResult(null)
    setError(null)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: C.text,
        fontFamily: C.fontSans,
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: C.font,
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            入札判断
          </h1>
          <p style={{ color: C.textSub, fontSize: 13, marginTop: 6 }}>
            想定売価と整備費を入力 → 入札上限を自動算出 → GO/NO GO を判定
          </p>
        </header>

        {/* 相場取得 */}
        <section
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontFamily: C.font,
              fontSize: 14,
              margin: "0 0 14px",
              color: C.blue,
              letterSpacing: "0.05em",
            }}
          >
            # MARKET_LOOKUP
          </h2>

          {/* モデル絞り込みフィルタ */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            {["", "Honda", "Yamaha", "Suzuki", "Kawasaki"].map((m) => (
              <FilterChip
                key={m || "ALL_M"}
                label={m || "全メーカー"}
                active={makerFilter === m}
                onClick={() => setMakerFilter(m)}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <FilterChip
              label="全排気量"
              active={ccFilter === ""}
              onClick={() => setCcFilter("")}
            />
            {CC_RANGES.map((r) => (
              <FilterChip
                key={r}
                label={r}
                active={ccFilter === r}
                onClick={() => setCcFilter(r)}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            {["", "4mini", "ネイキッド", "オフ", "カブ", "スクーター", "アメリカン", "レプリカ"].map((c) => (
              <FilterChip
                key={c || "ALL_C"}
                label={c || "全カテゴリ"}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              />
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 10,
              alignItems: "end",
              marginBottom: marketStats || marketError ? 12 : 0,
            }}
          >
            <Field label={`モデル選択 (${filteredModels.length}件)`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <input
                  type="text"
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  placeholder="🔍 名前・型式で検索"
                  style={{ ...inputStyle, fontSize: 12 }}
                />
                <select
                  value={modelIndex}
                  onChange={(e) => {
                    setModelIndex(e.target.value)
                    setCustomQuery("")
                  }}
                  style={selectStyle}
                  size={1}
                >
                  <option value="">— モデルを選択 —</option>
                  {filteredModels.map(({ model, originalIndex }) => (
                    <option key={`${model.query}-${originalIndex}`} value={String(originalIndex)}>
                      {model.maker} / {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="または検索ワード">
              <input
                type="text"
                value={customQuery}
                onChange={(e) => {
                  setCustomQuery(e.target.value)
                  setModelIndex("")
                }}
                placeholder="例: モンキー Z50J"
                style={inputStyle}
              />
            </Field>
            <button
              onClick={handleFetchMarket}
              disabled={fetchingMarket}
              style={{
                ...btnStyle,
                background: C.blue,
                color: "#000",
                opacity: fetchingMarket ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {fetchingMarket ? "取得中..." : "相場取得"}
            </button>
          </div>


          {marketError && (
            <div
              style={{
                padding: 10,
                background: "rgba(239,68,68,0.1)",
                color: C.red,
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              {marketError}
            </div>
          )}

          {marketStats && effectiveStats && (
            <div>
              {/* 自社実績 */}
              {ownStats && ownStats.count > 0 && (
                <div
                  style={{
                    padding: 10,
                    background: "rgba(249,115,22,0.06)",
                    border: `1px solid ${C.orange}`,
                    borderRadius: 6,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: C.font,
                      fontSize: 10,
                      color: C.orange,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    🏠 自社実績 {ownStats.count}件（同車種売却済）
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 9,
                          color: C.textSub,
                        }}
                      >
                        売却中央値
                      </div>
                      <button
                        onClick={() => applyMarketPrice(ownStats.median)}
                        style={{
                          background: "none",
                          border: "none",
                          color: C.orange,
                          fontFamily: C.font,
                          fontSize: 16,
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: 0,
                        }}
                        title="タップで想定売価に適用"
                      >
                        {fmt(ownStats.median)}
                      </button>
                    </div>
                    <div>
                      <div style={{ fontFamily: C.font, fontSize: 9, color: C.textSub }}>
                        平均利益
                      </div>
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 14,
                          fontWeight: 700,
                          color: ownStats.avgProfit >= 0 ? C.green : C.red,
                        }}
                      >
                        {fmt(ownStats.avgProfit)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: C.font, fontSize: 9, color: C.textSub }}>
                        平均在庫日数
                      </div>
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.text,
                        }}
                      >
                        {ownStats.avgDaysInStock}日
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: C.font, fontSize: 9, color: C.textSub }}>
                        価格帯
                      </div>
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.text,
                        }}
                      >
                        {fmt(ownStats.min)}〜{fmt(ownStats.max)}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: C.font,
                      fontSize: 9,
                      color: C.textMuted,
                      marginTop: 6,
                    }}
                  >
                    ルール: 自社実績 &gt; ヤフオク中央値 を優先
                  </div>
                </div>
              )}

              <div
                style={{
                  fontFamily: C.font,
                  fontSize: 11,
                  color: C.textSub,
                  marginBottom: 8,
                }}
              >
                ヤフオク落札 {effectiveStats.count}件
                {excludedUrls.size > 0 && (
                  <span style={{ color: C.red, marginLeft: 8 }}>
                    （{excludedUrls.size}件除外中・
                    <button
                      onClick={() => setExcludedUrls(new Set())}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.orange,
                        cursor: "pointer",
                        fontSize: 11,
                        textDecoration: "underline",
                        padding: 0,
                      }}
                    >
                      リセット
                    </button>
                    ）
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <PriceCell
                  label="中央値"
                  price={effectiveStats.median}
                  highlight
                  onApply={() => applyMarketPrice(effectiveStats.median)}
                />
                <PriceCell
                  label="10%除外平均"
                  price={effectiveStats.trimmedAvg}
                  onApply={() => applyMarketPrice(effectiveStats.trimmedAvg)}
                />
                <PriceCell
                  label="平均"
                  price={effectiveStats.avg}
                  onApply={() => applyMarketPrice(effectiveStats.avg)}
                />
                <PriceCell
                  label="25-75%帯"
                  price={0}
                  rangeText={`${fmt(effectiveStats.range.low)} 〜 ${fmt(
                    effectiveStats.range.high
                  )}`}
                />
                <PriceCell
                  label="最安-最高"
                  price={0}
                  rangeText={`${fmt(effectiveStats.min)} 〜 ${fmt(
                    effectiveStats.max
                  )}`}
                />
              </div>
              <div
                style={{
                  fontFamily: C.font,
                  fontSize: 10,
                  color: C.textMuted,
                  marginBottom: 14,
                }}
              >
                中央値 をタップして想定売価に適用（ルール: 中央値採用）
              </div>

              {/* 落札例リスト */}
              {marketResults.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: C.font,
                          fontSize: 11,
                          color: C.textSub,
                        }}
                      >
                        落札例
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(
                            e.target.value as
                              | "date"
                              | "price_asc"
                              | "price_desc"
                              | "bids_desc"
                          )
                        }
                        style={{
                          ...inputStyle,
                          fontSize: 10,
                          padding: "4px 6px",
                        }}
                      >
                        <option value="date">新しい順</option>
                        <option value="price_asc">価格↑</option>
                        <option value="price_desc">価格↓</option>
                        <option value="bids_desc">入札数↓</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <TagFilter
                        label="ALL"
                        active={conditionFilter === "ALL"}
                        onClick={() => setConditionFilter("ALL")}
                        color={C.textSub}
                      />
                      {(["美品", "実動", "要整備", "不動/部品"] as ConditionTag[]).map(
                        (tag) => {
                          const count = visibleResults.filter(
                            (r) => detectConditionTag(r.title) === tag
                          ).length
                          if (count === 0) return null
                          return (
                            <TagFilter
                              key={tag}
                              label={`${tag} ${count}`}
                              active={conditionFilter === tag}
                              onClick={() => setConditionFilter(tag)}
                              color={TAG_COLOR[tag]}
                            />
                          )
                        }
                      )}
                    </div>
                  </div>

                  {/* 絞り込み後の中央値再計算 */}
                  {conditionFilter !== "ALL" && (() => {
                    const filtered = visibleResults.filter(
                      (r) => detectConditionTag(r.title) === conditionFilter
                    )
                    if (filtered.length === 0) return null
                    const sorted = [...filtered]
                      .map((r) => r.price)
                      .sort((a, b) => a - b)
                    const median = sorted[Math.floor(sorted.length / 2)]
                    return (
                      <div
                        style={{
                          padding: 10,
                          background: "rgba(34,197,94,0.08)",
                          border: `1px solid ${TAG_COLOR[conditionFilter]}`,
                          borderRadius: 6,
                          marginBottom: 10,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: C.font,
                              fontSize: 9,
                              color: C.textSub,
                              textTransform: "uppercase",
                            }}
                          >
                            {conditionFilter} の中央値（{filtered.length}件）
                          </div>
                          <div
                            style={{
                              fontFamily: C.font,
                              fontSize: 18,
                              fontWeight: 700,
                              color: TAG_COLOR[conditionFilter],
                            }}
                          >
                            {fmt(median)}
                          </div>
                        </div>
                        <button
                          onClick={() => applyMarketPrice(median)}
                          style={{
                            ...btnStyle,
                            background: TAG_COLOR[conditionFilter],
                            color: "#000",
                            padding: "8px 14px",
                            fontSize: 11,
                          }}
                        >
                          適用
                        </button>
                      </div>
                    )
                  })()}

                  <div
                    style={{
                      maxHeight: 280,
                      overflowY: "auto",
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                    }}
                  >
                    {[...visibleResults
                      .filter((r) =>
                        conditionFilter === "ALL"
                          ? true
                          : detectConditionTag(r.title) === conditionFilter
                      )]
                      .sort((a, b) => {
                        if (sortBy === "price_asc") return a.price - b.price
                        if (sortBy === "price_desc") return b.price - a.price
                        if (sortBy === "bids_desc") return b.bids - a.bids
                        return 0 // date = 元の順（新しい順でAPIから来る）
                      })
                      .map((r, i) => {
                        const tag = detectConditionTag(r.title)
                        const mismatches = detectMismatch(r.title)
                        return (
                          <div
                            key={`${r.url}-${i}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 10px",
                              borderBottom: `1px solid ${C.border}`,
                              color: C.text,
                              fontSize: 12,
                              background:
                                mismatches.length > 0
                                  ? "rgba(234,179,8,0.06)"
                                  : "transparent",
                            }}
                          >
                            {mismatches.length > 0 && (
                              <span
                                title={`混入ワード: ${mismatches.join(", ")}`}
                                style={{
                                  fontFamily: C.font,
                                  fontSize: 9,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                  background: `${C.yellow}20`,
                                  color: C.yellow,
                                  border: `1px solid ${C.yellow}`,
                                  flexShrink: 0,
                                  whiteSpace: "nowrap",
                                  fontWeight: 700,
                                }}
                              >
                                ⚠ 要確認
                              </span>
                            )}
                            {tag && (
                              <span
                                style={{
                                  fontFamily: C.font,
                                  fontSize: 9,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                  background: `${TAG_COLOR[tag]}20`,
                                  color: TAG_COLOR[tag],
                                  border: `1px solid ${TAG_COLOR[tag]}`,
                                  flexShrink: 0,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {tag}
                              </span>
                            )}
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                textDecoration: "none",
                                color: C.text,
                              }}
                              title={r.title}
                            >
                              {r.title}
                            </a>
                            <span
                              style={{
                                fontFamily: C.font,
                                fontWeight: 700,
                                color: C.text,
                                flexShrink: 0,
                              }}
                            >
                              {fmt(r.price)}
                            </span>
                            <span
                              style={{
                                fontFamily: C.font,
                                fontSize: 10,
                                color: C.textMuted,
                                flexShrink: 0,
                                width: 36,
                                textAlign: "right",
                              }}
                            >
                              {r.bids}入
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExcludeUrl(r.url)}
                              title="この結果を除外"
                              style={{
                                flexShrink: 0,
                                width: 24,
                                height: 24,
                                borderRadius: 4,
                                border: `1px solid ${C.border}`,
                                background: "transparent",
                                color: C.textSub,
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 700,
                                padding: 0,
                                lineHeight: 1,
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 入力フォーム */}
        <section
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontFamily: C.font,
              fontSize: 14,
              margin: "0 0 16px",
              color: C.orange,
              letterSpacing: "0.05em",
            }}
          >
            # NEW_EVALUATION
          </h2>

          {/* 写真AI状態判定 */}
          <div
            style={{
              padding: 12,
              background: C.surfaceHigh,
              border: `1px dashed ${C.border}`,
              borderRadius: 8,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: aiResult || aiError ? 10 : 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: C.font,
                    fontSize: 10,
                    color: C.blue,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  📸 写真AI状態判定
                </div>
                <div
                  style={{
                    fontFamily: C.font,
                    fontSize: 10,
                    color: C.textMuted,
                    marginTop: 2,
                  }}
                >
                  複数写真アップロード → AIが A/B/C/D ランク + 整備費を判定
                </div>
              </div>
              <label
                style={{
                  ...btnStyle,
                  background: C.blue,
                  color: "#000",
                  opacity: analyzing ? 0.6 : 1,
                  cursor: analyzing ? "wait" : "pointer",
                  display: "inline-block",
                }}
              >
                {analyzing ? "判定中..." : "写真を選択"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  disabled={analyzing}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {aiError && (
              <div
                style={{
                  padding: 8,
                  background: "rgba(239,68,68,0.1)",
                  color: C.red,
                  borderRadius: 6,
                  fontSize: 11,
                }}
              >
                {aiError}
              </div>
            )}

            {aiResult && (
              <div
                style={{
                  padding: 10,
                  background: "rgba(59,130,246,0.08)",
                  border: `1px solid ${C.blue}`,
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: C.font,
                        fontSize: 9,
                        color: C.textSub,
                        textTransform: "uppercase",
                      }}
                    >
                      AI判定ランク
                    </div>
                    <div
                      style={{
                        fontFamily: C.font,
                        fontSize: 28,
                        fontWeight: 700,
                        color: C.blue,
                        lineHeight: 1,
                      }}
                    >
                      {aiResult.rank}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: C.font,
                        fontSize: 9,
                        color: C.textSub,
                        textTransform: "uppercase",
                      }}
                    >
                      整備費見積
                    </div>
                    <div
                      style={{
                        fontFamily: C.font,
                        fontSize: 18,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      {fmt(aiResult.repairCostEstimate)}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.textSub,
                    lineHeight: 1.4,
                  }}
                >
                  {aiResult.reasoning}
                </div>
                {aiResult.negativeItems.length > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      color: C.textMuted,
                    }}
                  >
                    指摘: {aiResult.negativeItems.join(" / ")}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Field label="車種カテゴリ">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VehicleCategory)}
                style={selectStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="状態ランク">
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value as ConditionRank)}
                style={selectStyle}
              >
                {RANKS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="BDS評価">
              <input
                type="text"
                value={bdsRating}
                onChange={(e) => setBdsRating(e.target.value)}
                placeholder="4, 3.5 等"
                style={inputStyle}
              />
            </Field>

            <Field label="車台番号">
              <input
                type="text"
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="想定売価（円）" required>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="250000"
                style={inputStyle}
              />
            </Field>

            <Field label="整備費見積（円）">
              <input
                type="number"
                value={repairCost}
                onChange={(e) => setRepairCost(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="陸送費（円）">
              <input
                type="number"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="広告費（円）">
              <input
                type="number"
                value={adCost}
                onChange={(e) => setAdCost(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="目標利益（円）">
              <input
                type="number"
                value={targetProfit}
                onChange={(e) => setTargetProfit(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="売価根拠（URL / メモ）">
              <input
                type="text"
                value={salePriceSource}
                onChange={(e) => setSalePriceSource(e.target.value)}
                placeholder="オークファン URL / 中央値の根拠"
                style={inputStyle}
              />
            </Field>
            <Field label="現場メモ">
              <input
                type="text"
                value={onsiteNotes}
                onChange={(e) => setOnsiteNotes(e.target.value)}
                placeholder="エンジン始動OK、外装すり傷 等"
                style={inputStyle}
              />
            </Field>
          </div>

          {/* リアルタイム試算プレビュー */}
          {preview && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                background: C.surfaceHigh,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  fontFamily: C.font,
                  fontSize: 11,
                  color: C.textSub,
                  marginBottom: 8,
                }}
              >
                PREVIEW (保存前試算)
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <Metric
                  label="入札上限（利益5万）"
                  value={fmt(preview.bid_limit_best)}
                  color={C.green}
                />
                <Metric
                  label="入札上限（利益2万）"
                  value={fmt(preview.bid_limit_min)}
                  color={C.yellow}
                />
                {preview.bid_limit_min <= 0 && (
                  <Metric label="判定" value="見送り推奨" color={C.red} />
                )}
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "rgba(239,68,68,0.1)",
                color: C.red,
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                ...btnStyle,
                background: C.orange,
                color: "#000",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "保存中..." : "保存する"}
            </button>
            <button onClick={handleReset} style={btnSecondaryStyle}>
              リセット
            </button>
          </div>

          {/* 保存結果表示 */}
          {result && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: "rgba(34,197,94,0.08)",
                border: `1px solid ${C.green}`,
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontFamily: C.font,
                  fontSize: 11,
                  color: C.green,
                  marginBottom: 10,
                }}
              >
                SAVED ✓
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <Metric
                  label="入札上限（ベスト）"
                  value={fmt(result.bid_limit_best)}
                  color={C.green}
                />
                <Metric
                  label="入札上限（最低ライン）"
                  value={fmt(result.bid_limit_min)}
                  color={C.yellow}
                />
                <Metric
                  label="判定"
                  value={result.bid_decision ?? "—"}
                  color={decisionColor(result.bid_decision)}
                />
              </div>
              {result.decision_reason && (
                <div
                  style={{ marginTop: 8, fontSize: 12, color: C.textSub }}
                >
                  理由: {result.decision_reason}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 評価一覧 */}
        <section
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2
            style={{
              fontFamily: C.font,
              fontSize: 14,
              margin: "0 0 16px",
              color: C.orange,
              letterSpacing: "0.05em",
            }}
          >
            # EVALUATIONS ({evaluations.length})
          </h2>
          {loadingList ? (
            <div style={{ color: C.textSub, fontSize: 13 }}>読み込み中...</div>
          ) : evaluations.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>
              評価はまだありません
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: C.font,
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ color: C.textSub, textAlign: "left" }}>
                    <Th>日時</Th>
                    <Th>車種</Th>
                    <Th>ランク</Th>
                    <Th>想定売価</Th>
                    <Th>整備費</Th>
                    <Th>上限(ベスト)</Th>
                    <Th>上限(最低)</Th>
                    <Th>判定</Th>
                    <Th>メモ</Th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((e) => (
                    <tr
                      key={e.id}
                      style={{ borderTop: `1px solid ${C.border}` }}
                    >
                      <Td color={C.textSub}>
                        {new Date(e.created_at).toLocaleDateString("ja-JP", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Td>
                      <Td>{e.vehicle_category ?? "—"}</Td>
                      <Td>{e.condition_rank ?? "—"}</Td>
                      <Td>{fmt(e.estimated_sale_price)}</Td>
                      <Td>{fmt(e.repair_cost_estimate)}</Td>
                      <Td color={C.green}>{fmt(e.bid_limit_best)}</Td>
                      <Td color={C.yellow}>{fmt(e.bid_limit_min)}</Td>
                      <Td color={decisionColor(e.bid_decision)}>
                        {e.bid_decision ?? "—"}
                      </Td>
                      <Td color={C.textSub}>
                        {e.vehicle?.onsite_notes ?? "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: C.font,
          fontSize: 10,
          color: C.textSub,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
        {required && <span style={{ color: C.orange, marginLeft: 4 }}>*</span>}
      </span>
      {children}
    </label>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: 12,
        border: `1px solid ${active ? C.orange : C.border}`,
        background: active ? C.orange : "transparent",
        color: active ? "#000" : C.textSub,
        fontFamily: C.font,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.03em",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  )
}

function TagFilter({
  label,
  active,
  onClick,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 8px",
        borderRadius: 10,
        border: `1px solid ${active ? color : C.border}`,
        background: active ? color : "transparent",
        color: active ? "#000" : color,
        fontFamily: C.font,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.03em",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  )
}

function PriceCell({
  label,
  price,
  rangeText,
  highlight,
  onApply,
}: {
  label: string
  price: number
  rangeText?: string
  highlight?: boolean
  onApply?: () => void
}) {
  const clickable = !!onApply
  return (
    <button
      onClick={onApply}
      disabled={!clickable}
      style={{
        background: highlight ? "rgba(34,197,94,0.1)" : C.surfaceHigh,
        border: `1px solid ${highlight ? C.green : C.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        textAlign: "left",
        cursor: clickable ? "pointer" : "default",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          fontFamily: C.font,
          fontSize: 9,
          color: C.textSub,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: C.font,
          fontSize: rangeText ? 11 : 16,
          fontWeight: 700,
          color: highlight ? C.green : C.text,
        }}
      >
        {rangeText ?? fmt(price)}
      </div>
    </button>
  )
}

function Metric({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: C.font,
          fontSize: 10,
          color: C.textSub,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: C.font,
          fontSize: 22,
          fontWeight: 700,
          color,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "8px 10px",
        fontWeight: 400,
        fontSize: 10,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  color,
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <td style={{ padding: "8px 10px", color: color ?? C.text }}>{children}</td>
  )
}

function decisionColor(d: BidDecision | null | undefined): string {
  if (d === "GO") return C.green
  if (d === "NO GO") return C.red
  if (d === "見送り") return C.textMuted
  return C.textSub
}

const inputStyle: React.CSSProperties = {
  background: "#0a0a0a",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "8px 10px",
  color: C.text,
  fontFamily: C.font,
  fontSize: 13,
  outline: "none",
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
}

const btnStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  fontFamily: C.font,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.05em",
  cursor: "pointer",
  textTransform: "uppercase",
}

const btnSecondaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: "transparent",
  color: C.textSub,
  border: `1px solid ${C.border}`,
}
