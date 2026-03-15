# Supabase 連携の現状

## 設定し忘れになりやすい点

### 1. 環境変数

| 変数 | 用途 | 必須 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー用（Server Actions・RSC） | ✅ |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | **ブラウザ用（市場価格ページの lib/api）** | **✅ 要設定** |

- 市場価格ページ（`/market`）は **lib/queries → lib/api → lib/supabase** 経由でブラウザから直接 Supabase にアクセスします。
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** を `.env.local` に設定していないと、ページ表示時に「Supabase の設定がありません」でエラーになります。
- `.env.example` に記載があるので、コピーして値を入れてください。

---

## スキーマの違い（lib/api と既存 DB）

### market_prices テーブル

| 項目 | 既存マイグレーション | lib/types.MarketPrice / lib/api |
|------|----------------------|----------------------------------|
| 列 | `id`, `model_name`, `bds_avg_jpy`, `yahoo_avg_jpy`, `created_at`, `updated_at` | `maker`, `model`, `year`, `condition`, `source`, `avg_price`, `min_price`, `max_price`, `sample_count`, `trend`, `trend_pct`, `memo`, ... |
| 用途 | 車種別 BDS/ヤフオク平均（app/actions/market-prices） | 市場価格マスター（メーカー・コンディション・トレンド付き） |

- **現状**: 既存テーブルは「車種名 + BDS/ヤフオク平均」の簡易版です。
- 市場価格ページで `getMarketPrices()` を呼ぶと、取得できるのは上記の既存列だけです。`MarketPrice` 型の `maker`, `model`, `avg_price` などは DB にないため **undefined** になり、一覧が空または不自然な表示になります。
- **対応案**  
  - **A)** 新マイグレーションで `market_prices` に列を追加し、lib/types に合わせる。  
  - **B)** 市場価格ページを既存テーブル（`app/actions/market-prices` + `MarketPriceRow`）に合わせ、Server Action で取得するように戻す。

### vehicles テーブル

- **既存**: `id`, `status`, `bds_rating`, `chassis_number`, `drive_link`, `name`, `image_url`, ...（lib/db/types の VehicleRow）
- **lib/types.Vehicle**: `maker`, `model`, `year`, `condition`, `purchase_price`, `target_price`, `status` (in_stock|listed|sold|exported), `location`, `memo`, `images`, ...
- lib/api の `getVehicles()` は既存の `vehicles` テーブルと列が異なります。現状の DB のままでは `Vehicle[]` として使うと不足フィールドが多くなります。

### assess_history テーブル

- **既存**: テーブル名は **`assessments`**（BDS 査定結果。bike_name, bid_limit など）。
- **lib/api**: **`assess_history`** を参照（manufacturer, vehicle_name, yahoo_avg_bid, bds_bid_limit など）。
- `assess_history` というテーブルはマイグレーションに**存在しません**。`getAssessHistory()` はそのままではエラーになります。

---

## まとめ

| 機能 | 状態 | 備考 |
|------|------|------|
| 環境変数（ANON_KEY） | ⚠️ 要設定 | 未設定だと市場価格ページでエラー |
| 市場価格（lib/api） | ⚠️ スキーマ不一致 | 既存 market_prices は簡易版。表示を合わせるにはマイグレーションまたは既存 API 利用に変更 |
| 在庫（getVehicles） | ⚠️ スキーマ不一致 | 既存 vehicles と lib/types.Vehicle が異なる |
| 査定履歴（getAssessHistory） | ❌ テーブルなし | 参照先は `assess_history`。実在するのは `assessments` |

「完全に機能している」とするには、少なくとも次のいずれかが必要です。

1. **NEXT_PUBLIC_SUPABASE_ANON_KEY** を `.env.local` に設定する。
2. **市場価格**: 既存の `app/actions/market-prices` + 既存 `market_prices` テーブルに合わせて画面・型を戻すか、新マイグレーションで `market_prices` を lib/types に合わせて拡張する。
3. **在庫・査定履歴** を lib/api で使う場合: 対応するテーブル（および必要なら `assess_history` の新規作成）をマイグレーションで用意し、lib/types と揃える。
