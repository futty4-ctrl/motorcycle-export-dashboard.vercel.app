# バイク輸出利益計算ダッシュボード — 全体計画・ロードマップ

このドキュメントは、AI（Gemini 等）に投げるための全体計画です。写真査定を補完する追加要素のロードマップと、実装方針を記載します。

---

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | MotoExport Pro（バイク輸出ダッシュボード） |
| 技術スタック | Next.js 16, React 19, TypeScript, Supabase, Tailwind, shadcn/ui |
| 主要機能 | 車両管理、写真査定（Gemini Vision）、利益シミュレーション、BDS スクショ解析 |
| デプロイ | Vercel |

---

## 2. 現状のデータモデル（Supabase）

### テーブル一覧

| テーブル | 主なカラム |
|----------|------------|
| **vehicles** | id, status, bds_rating, chassis_number, drive_link, name, lot_number, source_url, image_url |
| **evaluations** | vehicle_id, repair_cost_estimate, negative_items (JSONB), photo_analysis (JSONB), actual_repair_cost, actual_sale_price, actual_profit |
| **scenarios** | vehicle_id, scenario_type, profit, details (JSONB) |
| **parts** | vehicle_id, part_name, storage_location, quantity |
| **bad_cases** | vehicle_id, evaluation_id, ai_summary, actual_findings, focus_points (配列) |

### 既存フロー

1. 車両登録（ブックマークレット / BDS URL / 手動）
2. 写真アップロード（Supabase Storage: `vehicle-images` バケット）
3. BDS スクショ解析 → vehicleName, year, mileage, overallGrade, negativeItems, price, lotNumber
4. AI 査定（実車写真）→ 仕入れ上限価格・販売予想を算出
5. 利益シミュレーション（GAMI ルール）→ 目標利益額カスタム可、利益率表示
6. Bad Case 保存 → 次回の写真査定で重点チェックに反映

---

## 3. 追加予定の5つの領域（ロードマップ）

### 3.1 オークション・市場データ

**目的**: 相場感を数値で補強し、査定精度を上げる

| 機能 | 概要 | 実装難易度 |
|------|------|-----------|
| ヤフオク落札相場 | 現状は検索リンクのみ。将来的に API / スクレイピングで数値を取得 | 高（利用規約・技術的制約要確認） |
| 過去の BDS 落札履歴 | `scenarios` の scenario_type='bookmarklet' の profit を車種別に集計（既に `lib/bds-past-average.ts` で一部実装） | 低 |
| 車種ごとの相場推移 | vehicles.name 等でグループ化し、時系列で平均落札価格を可視化 | 中 |

**DB 追加候補**: `market_price_history`（車種名, 集計日, 平均価格, 件数）

---

### 3.2 現物確認用チェックリスト

**目的**: 写真では分からない項目を記録し、実査定結果を次回に活かす

| 機能 | 概要 | 実装難易度 |
|------|------|-----------|
| 確認項目リスト | エンジン音、走行系、書類、錆の有無など現地で確認すべき項目を定義 | 低 |
| チェック結果の保存 | 車両ごとに「確認済み / 要再確認 / 問題あり」などを記録 | 低 |
| 実査定結果の保存 | 現物確認後のメモ・判定を evaluations や別テーブルに紐づけ | 中 |

**DB 追加候補**:
- `inspection_checklist_items`（マスタ）: id, category, label, sort_order
- `vehicle_inspection_results` (vehicle_id, item_id, status, note, checked_at)

---

### 3.3 実績データの蓄積

**目的**: 予測 vs 実績のギャップを数値化し、査定精度を改善する

| 機能 | 概要 | 現状 |
|------|------|------|
| 落札価格 vs 予測 | 実際の落札価格と予測のズレを記録・分析 | evaluations.actual_* あり。 scenarios に落札額を紐づけ可能 |
| 売却価格 vs 想定 | 実際の売却額と想定のズレ | evaluations.actual_sale_price で蓄積可能 |
| 写真査定の精度 | 査定結果 vs 実績を数値化（RMSE, ヒートマップ等） | analytics ページで予想 vs 実績のグラフあり。査定精度専用の可視化は未実装 |

**DB 追加候補**: 既存 evaluations の actual_* を活用。`scenarios.details` に落札額・売却額を記録する拡張。

---

### 3.4 外部データ連携

**目的**: 修理費・部品相場・為替・トレンドで判断材料を増やす

| 機能 | 概要 | 実装難易度 |
|------|------|-----------|
| 車種別修理費相場 | 外部 API または静的データで車種ごとの修理費レンジを取得 | 中（データソース要検討） |
| 部品・カスタムの相場 | eBay 等の価格を参照（既にプレミアムパーツ加算あり） | 中 |
| 為替 | 既存で fetchUsdJpyRate 等で取得 | 済 |
| 市場トレンド | 車種人気度・価格トレンド（データソース要検討） | 高 |

---

### 3.5 ユーザー入力の強化

**目的**: 人的知見を構造化して蓄積する

| 機能 | 概要 | 現状 |
|------|------|------|
| 現地メモ・所見 | 車両詳細ページに自由記述フィールドを追加 | 一部 evaluations.photo_analysis.note 等で対応可能。専用カラムは未実装 |
| 売主からの情報 | 売主コメント・条件などを記録 | 未実装 |
| Bad Case 蓄積 | AI が「綺麗」と判断したが実際は不良だった事例 | 既存。`bad_cases` テーブル、`getBadCaseFocusPoints` で重点チェックに反映 |

**DB 追加候補**:
- `vehicles`: `onsite_notes` (TEXT), `seller_info` (JSONB)
- または evaluations に `onsite_notes`, `seller_info` を追加

---

## 4. 推奨実装順序

| フェーズ | 内容 | 工数目安 |
|----------|------|----------|
| **Phase 1** | 現物確認チェックリスト（マスタ + 結果保存 + UI） | 小 |
| **Phase 2** | ユーザー入力強化（現地メモ・売主情報） | 小 |
| **Phase 3** | 実績データの分析強化（査定精度の可視化） | 中 |
| **Phase 4** | 過去 BDS 落札履歴の可視化（車種別相場） | 中 |
| **Phase 5** | 外部データ連携・ヤフオク API（要調査） | 大 |

---

## 5. 主要ファイル構成（参考）

```
app/
  actions/vehicles.ts       # 車両 CRUD, 写真解析, BDS 取り込み
  actions/bad-cases.ts      # Bad Case 保存・重点項目取得
  api/analyze-photo/        # AI 査定 API
  vehicle/[id]/page.tsx     # 車両詳細
components/
  vehicle-detail-content.tsx  # 利益シミュレーター, 査定 UI
  dashboard-content.tsx       # ダッシュボード, ヤフオク検索
lib/
  profit-calc.ts            # GAMI 利益計算
  bds-past-average.ts       # 過去 BDS 相場
  ai/photo-analyzer.ts      # BDS スクショ解析
  ai/photo-appraiser.ts     # 実車写真査定
supabase/
  migrations/               # DB マイグレーション
```

---

## 6. 補足（Gemini への依頼例）

「このロードマップに従い、Phase 1 の現物確認チェックリストを実装してください。`supabase/migrations/` にマイグレーションを追加し、`components/vehicle-detail-content.tsx` にチェックリスト UI を組み込んでください。チェック項目は以下とします：エンジン始動・アイドリング、走行系（サス・ブレーキ）、書類（車検・ナンバー）、錆・腐食、電気系。」
