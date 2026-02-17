# 実装サマリ（ここまでの状態）

## 1. Cursor ルール（AI の前提・方針）

| ファイル | 内容 |
|----------|------|
| `.cursor/rules/ui-typescript-mobile-first.mdc` | **UI**: Tailwind + shadcn、高級感ダークモード、**PWA・スマホ最優先**。<br>**型**: TypeScript 厳格、型漏れ禁止。<br>**ビジネス**: 4mini ブランド価値の反映、車体販売 vs パーツバラしの2パターン比較、ヤフオク vs eBay アービトラージ視点。<br>**異常検知**: 低解像度時は「要再確認」と正直報告、ボルト・ワイヤー・オイルパン等の重点ズーム解析。 |
| `.cursor/rules/4mini-appraiser.mdc` | 4mini 専門査定士プロフィール、鑑定基準、リスク判定、バラし利益算出ロジック。 |

---

## 2. 利益計算・プレミアムパーツ加算

| 対象 | 内容 |
|------|------|
| **`lib/premium-parts-bonus.ts`** | 4種のプレミアムパーツをキーワード検知し、eBay 相場（レンジ中間値）を利益に**自動加算**。<br>・ヨシムラ製キャブ (TMR/FCR): 4〜7万円 → 5.5万<br>・Gクラフト製スイングアーム: 2〜4万 → 3万<br>・武川製スーパーヘッド: 5〜10万 → 7.5万<br>・当時物純正タンク（塗装良好）: 3〜5万 → 4万 |
| **`components/vehicle-detail-content.tsx`** | 利益シミュレーションで `calcPremiumPartsBonusJpy()` を利用。プレミアム4種は固定加算を優先し、他ブランドは AI 見積のみ（二重計上防止）。 |
| **`lib/ai/fourmini-analyzer.ts`** | 上記4種を検出したら `partName` 等にキーワードを書くようプロンプトで指示。 |

---

## 3. Bad Case（見落とし事例の蓄積・重点チェック）

| 対象 | 内容 |
|------|------|
| **DB** `supabase/migrations/20260218000000_bad_cases.sql` | `bad_cases` テーブル: `evaluation_id`, `vehicle_id`, `ai_summary`, `actual_findings`, `focus_points`（重点チェック項目の配列）。 |
| **`app/actions/bad-cases.ts`** | `saveBadCase()`: 査定を Bad Case として保存。`focus_points` 未入力時は `actual_findings` から自動抽出。<br>`getBadCaseFocusPoints()`: 過去 Bad Case から重点項目を集約（重複除去）。 |
| **`lib/ai/photo-analyzer.ts`** | `analyzeVehiclePhotosWithGrades(images, { focusPoints })`: 第2引数で `focusPoints` を渡すと、プロンプトに「過去の見落としを防ぐため以下を重点チェック」として追加。 |
| **`app/actions/vehicles.ts`** | `runPhotoAnalysis()` 内で `getBadCaseFocusPoints()` を取得し、`analyzeVehiclePhotosWithGrades(images, { focusPoints })` に渡す。 |
| **UI** `components/vehicle-detail-content.tsx` | 写真解析結果がある査定で「**Bad Case として保存**」ボタン表示。ダイアログで「実際の状態」「重点チェック項目（任意・カンマ区切り）」を入力して保存。 |

---

## 4. 異常検知の強化（解像度・重点ズーム）

| 対象 | 内容 |
|------|------|
| **写真一括解析** `lib/ai/photo-analyzer.ts` | **解像度ルール**: 不鮮明・低解像度の写真は推測せず、`note` に「写真N: 不鮮明のため要再確認」、`riskAreas` に「写真N: 解像度不足のため要再確認」を追加。<br>**重点ズーム解析**: ボルトの頭、ワイヤー取り回し・断線、オイルパン底面、フレーム接合部・溶接部、キャブ周りを重点チェックし、異常は `riskAreas` に bbox 付きで記載。 |
| **厳格鑑定** 同ファイル `STRICT_INSPECTION_PROMPT` | 同様の解像度ルール（「写真N: 不鮮明のため要再確認」を `strictFindings` に記載）。同じ重点ズーム箇所を明示。 |
| **表示** `components/ai-zoom-inspection.tsx` | AI が検知した `riskAreas`（bbox 付き）を、該当範囲で切り出して表示（AIズーム・インスペクション）。 |

---

## 5. DB マイグレーション一覧

| ファイル | 内容 |
|----------|------|
| `20260213000000_initial_vehicle_tables.sql` | vehicles, evaluations, scenarios, parts。 |
| `20260214000000_drive_uploads.sql` | drive_uploads。 |
| `20260215000000_evaluations_photo_analysis.sql` | evaluations に `photo_analysis` JSONB 追加。 |
| `20260216000000_yahoo_auctions_cache.sql` | ヤフオクキャッシュ用。 |
| `20260217000000_evaluations_actuals.sql` | evaluations に actual_repair_cost, actual_sale_price, actual_profit。 |
| **`20260218000000_bad_cases.sql`** | **bad_cases テーブル追加。** |

※ Bad Case を使う場合は `npx supabase db push` または `npx supabase migration up` でマイグレーションを実行してください。

---

## 6. 主なファイル構成（今回触ったもの）

```
.cursor/rules/
  ui-typescript-mobile-first.mdc   # コーディング・ビジネス・異常検知方針
  4mini-appraiser.mdc              # 4mini 査定士プロフィール

lib/
  premium-parts-bonus.ts           # プレミアムパーツ検知・eBay加算
  ai/photo-analyzer.ts             # 写真解析（解像度ルール・重点ズーム・Bad Case focusPoints）
  ai/fourmini-analyzer.ts          # 4mini鑑定（プレミアム4種の検出指示）
  db/types.ts                     # BadCaseRow / BadCaseInsert 追加

app/actions/
  bad-cases.ts                    # saveBadCase, getBadCaseFocusPoints
  vehicles.ts                     # runPhotoAnalysis で focusPoints 取得・渡し
  evaluate.ts                     # BDS査定・ヤフオク vs eBay 比較

components/
  vehicle-detail-content.tsx      # 利益計算（プレミアム加算）、Bad Case 保存 UI
  ai-zoom-inspection.tsx          # riskAreas の bbox ズーム表示

supabase/migrations/
  20260218000000_bad_cases.sql    # bad_cases テーブル
```

---

## 7. フロー整理

1. **車両登録** → Drive フォルダ作成 → 写真アップロード。
2. **写真一括解析** → Bad Case の重点項目をプロンプトに注入 → 解像度・重点ズームルールで解析 → `evaluations.photo_analysis` に保存。
3. **4mini鑑定**（任意）→ ブランドパーツ・リスク・オリジナル度を `photo_analysis` にマージ。
4. **厳格鑑定**（任意）→ 修理費見積を `photo_analysis` にマージ。
5. **利益シミュレーション** → プレミアム4種は固定加算、他は AI 見積 → ヤフオク車体 vs eBay パーツで比較。
6. **Bad Case** → 「綺麗と言ったが実際はボロかった」を保存 → 次回の写真解析で重点チェックに反映。

以上がここまでの実装の全体像です。
