# レビュー用チェックリスト（4点）

第三者やクライアントに「技術的な土台・鑑定マニュアル・データ設計・ロジック」を見せるためのまとめです。

---

## 1. package.json（どんな道具を使っているか）

**チェックポイント**: スクレイピング用ツールは入っているか？画像処理ライブラリは適切か？

```json
{
  "name": "my-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "@hookform/resolvers": "^3.9.1",
    "@radix-ui/react-accordion": "1.2.2",
    "@radix-ui/react-alert-dialog": "1.1.4",
    "@radix-ui/react-aspect-ratio": "1.1.1",
    "@radix-ui/react-avatar": "1.1.2",
    "@radix-ui/react-checkbox": "1.1.3",
    "@radix-ui/react-collapsible": "1.1.2",
    "@radix-ui/react-context-menu": "2.2.4",
    "@radix-ui/react-dialog": "1.1.4",
    "@radix-ui/react-dropdown-menu": "2.1.4",
    "@radix-ui/react-hover-card": "1.1.4",
    "@radix-ui/react-label": "2.1.1",
    "@radix-ui/react-menubar": "1.1.4",
    "@radix-ui/react-navigation-menu": "1.2.3",
    "@radix-ui/react-popover": "1.1.4",
    "@radix-ui/react-progress": "1.1.1",
    "@radix-ui/react-radio-group": "1.2.2",
    "@radix-ui/react-scroll-area": "1.2.2",
    "@radix-ui/react-select": "2.1.4",
    "@radix-ui/react-separator": "1.1.1",
    "@radix-ui/react-slider": "1.2.2",
    "@radix-ui/react-slot": "1.1.1",
    "@radix-ui/react-switch": "1.1.2",
    "@radix-ui/react-tabs": "1.1.2",
    "@radix-ui/react-toast": "1.2.4",
    "@radix-ui/react-toggle": "1.1.1",
    "@radix-ui/react-toggle-group": "1.1.1",
    "@radix-ui/react-tooltip": "1.1.6",
    "@supabase/supabase-js": "^2.47.0",
    "autoprefixer": "^10.4.20",
    "cheerio": "^1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "8.5.1",
    "framer-motion": "^11.15.0",
    "googleapis": "^144.0.0",
    "input-otp": "1.4.1",
    "lucide-react": "^0.544.0",
    "next": "16.1.6",
    "next-themes": "^0.4.6",
    "react": "19.2.3",
    "react-day-picker": "8.10.1",
    "react-dom": "19.2.3",
    "react-hook-form": "^7.54.1",
    "react-resizable-panels": "^2.1.7",
    "recharts": "2.15.0",
    "sonner": "^1.7.1",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "19.2.7",
    "@types/react-dom": "19.2.3",
    "postcss": "^8.5",
    "tailwindcss": "^3.4.17",
    "typescript": "5.7.3"
  }
}
```

**要約**

| 用途 | ライブラリ |
|------|------------|
| AI（画像解析・鑑定） | `@google/generative-ai`（Gemini） |
| スクレイピング・HTML解析 | `cheerio` |
| DB | `@supabase/supabase-js` |
| スプレッドシート・Drive | `googleapis` |
| UI | Next.js 16, React 19, Radix UI, Tailwind, shadcn 系（clsx, tailwind-merge, class-variance-authority 等）, recharts, framer-motion |
| フォーム・バリデーション | `react-hook-form`, `@hookform/resolvers`, `zod` |

- **スクレイピング**: `cheerio` でHTMLパース。専用スクレイパー（Puppeteer/Playwright）は未使用。
- **画像処理**: 専用ライブラリ（Sharp 等）はなし。画像は Base64 で Gemini Vision に渡している。

---

## 2. システムプロンプト（AI に渡している「鑑定マニュアル」）

**チェックポイント**: 4miniプロ鑑定マニュアルが正しく反映されているか、AIがサボらない設定か。

プロジェクトでは **Cursor ルール**（`.cursor/rules/`）を「鑑定マニュアル」として使い、`lib/ai/` のプロンプト設計に反映しています。

### 2.1 4mini専門査定士ルール（`4mini-appraiser.mdc`）

- **対象**: `lib/ai/**`, `vehicle-detail*`, `analytics*`, `inventory*`
- **内容**: 20年以上キャリアの4mini専門査定士・メカニックのプロフィールと鑑定基準。

```
- エンジン・吸気系: ボアアップ、キャブ（PC20/VM26/FCR/TMR）、オイル滲み
- 外装・フレーム: タンク（サビ・凹み・再塗装）、フレーム打刻・中華コピー疑い、シート
- 足回り・カスタム: スイング（Gクラフト等）、マフラー（ヨシムラ/OVER/モリワキ）、ホイール/サス
- リスク判定: 年式チグハグ、中華パーツ多用、ボルトなめ
- 利益算出: 車体転売 vs バラし（エンジン・キャブ・マフラー・タンク・フレーム）、(バラし価値 - 解体工賃) > 車体価格 → バラし推奨
```

### 2.2 コードに埋め込まれているプロフィール（`lib/ai/4mini-expert-profile.ts`）

Gemini の画像解析プロンプトの冒頭に必ず挿入される文字列です。

```typescript
export const FOURMINI_EXPERT_PROFILE = `## プロフィール
あなたは20年以上のキャリアを持つ「4mini（モンキー・ゴリラ・エイプ・ダックス・シャリィ）」専門の査定士兼メカニックです。...

## 重点チェック項目と鑑定基準
### ① エンジン・吸気系（心臓部）
- ボアアップの有無、キャブレター（PC20, VM26, FCR, TMR等）、オイル滲み
### ② 外装・フレーム（資産価値）
- タンク、フレーム打刻・中華コピー疑い、シート
### ③ 足回り・カスタムパーツ（利益の源泉）
- スイングアーム（Gクラフト等）、マフラー（ヨシムラ、OVER、モリワキ等）、ホイール/サスペンション
## リスク判定（レッドフラッグ）
- 年式のチグハグ、中華パーツの多用、ボルトのなめ
## 利益算出の考え方
- 車体転売価値 / バラし売り価値 / (バラし価値 - 解体工賃) > 車体販売価格 → バラし推奨
```

### 2.3 写真解析プロンプトで「サボらない」ようにしている部分（`lib/ai/photo-analyzer.ts`）

- **解像度ルール**: 不鮮明・低解像度の場合は推測せず「不鮮明のため要再確認」と note / riskAreas に記載。
- **重点ズーム解析**: ボルトの頭、ワイヤー、オイルパン底面、フレーム接合部・溶接部、キャブ周りを重点チェックし、異常は riskAreas に bbox 付きで記載。
- **Bad Case 反映**: `focusPoints`（過去の見落とし事例）を渡すと「過去の見落としを防ぐため以下を重点チェック」としてプロンプトに追加。

→ 4miniマニュアルはルールとプロフィールの両方で反映され、解像度・重点ズーム・見落とし防止で「サボらない」設定になっている。

---

## 3. Supabase テーブル構成（スキーマ）

**チェックポイント**: 利益計算に必要な項目（陸送費、関税、手数料など）の枠が用意されているか。

### 3.1 車両・査定・シナリオ（初期）

| テーブル | 主なカラム | 備考 |
|----------|------------|------|
| **vehicles** | id, status, bds_rating, chassis_number, drive_link, created_at, updated_at | 車両基本情報 |
| **evaluations** | id, vehicle_id, repair_cost_estimate, negative_items, created_at, updated_at | AI査定結果（修理費予測・ネガティブ項目） |
| **scenarios** | id, vehicle_id, scenario_type, profit, details (JSONB), created_at, updated_at | 利益計算シナリオ（yahoo_body / ebay_parts 等）。単価・数量等は details に格納 |
| **parts** | id, vehicle_id, part_name, storage_location, quantity, created_at, updated_at | 解体後のパーツリスト |

### 3.2 追加マイグレーション

| ファイル | 内容 |
|----------|------|
| `20260214000000_drive_uploads.sql` | **drive_uploads**: file_url, file_name, mime_type, drive_folder_id, vehicle_id 等（Drive アップロードURL） |
| `20260215000000_evaluations_photo_analysis.sql` | **evaluations.photo_analysis** (JSONB): オークション写真一括解析結果（外装傷・エンジン腐食・消耗品・カスタム・高値eBayパーツ等） |
| `20260216000000_yahoo_auctions_cache.sql` | ヤフオクキャッシュ用テーブル（必要に応じて参照） |
| `20260217000000_evaluations_actuals.sql` | **evaluations**: actual_repair_cost, actual_sale_price, actual_profit（実績比較用） |
| `20260218000000_bad_cases.sql` | **bad_cases**: evaluation_id, vehicle_id, ai_summary, actual_findings, focus_points（見落とし事例→次回重点チェック） |
| `20260219000000_rls_enable.sql` | 全テーブルで RLS 有効化 |

**利益計算まわり**

- **陸送費・手数料・送料・関税**は、テーブルには「枠」としては **scenarios.details (JSONB)** に含める想定。実際の入力・表示は **フロント（車両詳細の利益シミュ）** と **`lib/profit-calc.ts`** で行い、計算結果の `profit` を scenarios に保存する形。
- 修理費: **evaluations.repair_cost_estimate**（予想）、**evaluations.actual_repair_cost**（実績）。
- 売却額・利益の実績: **evaluations.actual_sale_price**, **evaluations.actual_profit**。

→ 利益計算に必要な「陸送費・手数料・送料」は **アプリ側のパラメータと `profit-calc.ts`** で扱い、**scenarios.profit + details** と **evaluations の actual_*** で保存する構成になっている。

---

## 4. 主要なロジック部分（1〜2ファイル）

計算式の正しさ・エラーが出やすい書き方のチェック用です。

### 4.1 AI解析の司令塔（写真解析の流れ）

**`app/actions/vehicles.ts`** の `runPhotoAnalysis` が「Drive フォルダ → 画像取得 → Gemini 解析 → evaluations 保存」の司令塔です。

```typescript
const MAX_PHOTOS_FOR_ANALYSIS = 20

export async function runPhotoAnalysis(vehicleId: string): Promise<{
  success: boolean
  error?: string
  evaluationId?: string
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data: vehicle, error: veError } = await supabase
      .from("vehicles")
      .select("drive_link")
      .eq("id", vehicleId)
      .single()
    if (veError || !vehicle?.drive_link) {
      return { success: false, error: "車両または Drive フォルダが見つかりません。" }
    }
    const folderId = extractDriveFolderId(vehicle.drive_link)
    if (!folderId) {
      return { success: false, error: "Drive フォルダIDを取得できませんでした。" }
    }
    const imageFiles = await listImageFilesInFolder(folderId)
    if (imageFiles.length === 0) {
      return { success: false, error: "フォルダ内に画像がありません。写真をアップロードしてください。" }
    }
    const toFetch = imageFiles.slice(0, MAX_PHOTOS_FOR_ANALYSIS)
    const images: { base64: string; mimeType: string }[] = []
    for (const f of toFetch) {
      const base64 = await getDriveFileContentAsBase64(f.id, f.mimeType)
      images.push({ base64, mimeType: f.mimeType })
    }
    const { focusPoints } = await getBadCaseFocusPoints()
    const analysis = await analyzeVehiclePhotosWithGrades(images, {
      focusPoints: focusPoints ?? undefined,
    })
    // ... allNegative, riskAreasWithFileId, photoAnalysisSave を組み立て ...
    const { data: inserted, error: insertError } = await supabase
      .from("evaluations")
      .insert({
        vehicle_id: vehicleId,
        repair_cost_estimate: null,
        negative_items: allNegative,
        photo_analysis: photoAnalysisSave as unknown as Record<string, unknown>,
      })
      .select("id")
      .single()
    if (insertError) throw insertError
    return { success: true, evaluationId: inserted?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "写真解析に失敗しました"
    return { success: false, error: message }
  }
}
```

- エラー処理: 各段階で `success: false` と `error` を返しており、最後は `throw` で catch してメッセージを統一している。
- `riskAreas` の `imageIndex` と Drive の `toFetch` の対応は `Math.max(0, Math.min(r.imageIndex - 1, toFetch.length - 1))` でインデックスをクリップしている。

### 4.2 利益計算ロジック（車体 vs バラし・為替）

**`lib/profit-calc.ts`**: 利益 = 販売予想価格 - (落札額 + 陸送費 + 修理費 + 手数料 + 送料)。ヤフオクは円、eBay は USD を為替で円換算して比較。

```typescript
export function calcProfit(params: {
  expectedSalePriceJpy: number
  winningBidJpy: number
  domesticShippingJpy: number
  repairCostJpy: number
  feesJpy: number
  shippingCostJpy: number
}): number {
  const cost =
    winningBidJpy +
    domesticShippingJpy +
    repairCostJpy +
    feesJpy +
    shippingCostJpy
  return expectedSalePriceJpy - cost
}

// ヤフオク車体: すべて円
export function calcYahooBodyScenario(params: {...}): YahooAuctionScenario { ... }

// eBayパーツ: 販売価格はUSD、手数料・送料もUSD → 為替で円換算して calcProfit
export function calcEbayPartsScenario(params: {...}, usdJpyRate: number): EbayPartsScenario {
  const feesJpy = Math.round(feesUsd * usdJpyRate)
  const shippingCostJpy = Math.round(shippingCostUsd * usdJpyRate)
  const expectedSalePriceJpy = baseSaleJpy + ebayBonusJpy  // プレミアムパーツ加算
  const profitJpy = calcProfit({ expectedSalePriceJpy, winningBidJpy, ... })
  ...
}

// 比較: 為替取得 → ヤフオク・eBay 両方計算 → 利益が高い方を recommended
export async function compareYahooVsEbay(params: {...}, getUsdJpy: () => Promise<number>) { ... }
```

- 計算式: 同じ `calcProfit` で統一されており、陸送費・修理費・手数料・送料がすべてコスト側に足されている。
- eBay は `feesUsd` / `shippingCostUsd` を `usdJpyRate` で円換算してから `calcProfit` に渡している。
- `ebayBonusJpy` でプレミアムパーツ加算を eBay 側の販売予想にだけ足している。

### 4.3 一覧比較（オークション比較）のロジック

**`components/auction-preview-content.tsx`**: 車両一覧の取得とテーブル表示。**利益計算は行わず**、Supabase またはスプレッドシートから取得した `vehicles` の `profitScore` / `expectedProfitJPY` を表示し、詳細は `/vehicle/[id]` へのリンクで誘導している。

```typescript
// データ取得: getVehiclesFromSupabase() と getVehiclesFromSheet() を並列実行
// Supabase に1件以上あれば Supabase を、なければスプレッドシートを表示
if (hasSupabase) setVehicles(supabaseRes.vehicles!)
else if (hasSheets) setVehicles(display)  // スプレッドシートの行を VehicleDisplay にマッピング
else setVehicles([])
// テーブル: 車両名、ステータス、利益スコア、予想利益（円）、詳細リンク
```

- エラー: `cancelled` でアンマウント後の setState を防いでいる。`loading` / `error` / 空リストで分岐して表示している。

---

以上が、**package.json・システムプロンプト（鑑定マニュアル）・Supabaseスキーマ・主要ロジック**の4点のまとめです。必要に応じてこのファイルをそのまま共有したり、該当ファイルを開いて詳細を確認できます。
