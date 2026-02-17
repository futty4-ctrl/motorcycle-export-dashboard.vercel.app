# 不具合・注意点とチェックリスト

ここまでの実装で把握している点と、デプロイ前に確認するとよい項目です。

---

## 修正済み

- **消耗品キーワード**: 「パッド」だけの一致でブレーキ経費が加算される可能性があったため、「ブレーキパッド」「ブレーキ」のいずれかが含まれる場合のみブレーキ扱いになるよう変更済みです。

---

## デプロイ・環境まわり

### 1. Vercel 自動デプロイ（GitHub Actions）

- **Secrets 未設定**: `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` を GitHub の Actions 用 Secrets に登録していないと、ワークフローが失敗します。
- **初回リンク**: まだ Vercel にプロジェクトがない場合は、ローカルで一度 `npx vercel link` して `.vercel/project.json` を生成し、そこから Org ID / Project ID を取得して Secrets に設定してください（`.vercel` は .gitignore に入っているのでリポジトリにはコミットしません）。

### 2. Supabase マイグレーション

- **evaluations の actual 系カラム**: `actual_repair_cost` / `actual_sale_price` / `actual_profit` を追加するマイグレーション（`20260217000000_evaluations_actuals.sql`）を**まだ実行していない**場合、予想 vs 実績ページや実績入力でエラーになることがあります。
- 対応: `npx supabase db push` または Supabase ダッシュボードの SQL エディタで該当マイグレーションを実行してください。

### 3. 在庫管理のパーツ一覧（getPartsForInventory）

- Supabase のリレーション名が `vehicles` 以外（例: 単数形や別名）の場合は、`vehicles(chassis_number)` の部分で取得できず、車体番号が null になる可能性があります。その場合は Supabase のテーブル/リレーション名に合わせて select を変更してください。

---

## 動作確認しておくとよい箇所

| 項目 | 確認内容 |
|------|----------|
| 写真アップロード（/upload） | 複数枚選択 → 1フォルダにまとまって保存されるか |
| 車両詳細の実績入力 | 実際の修理費・売却額・利益を保存し、予想 vs 実績に反映されるか |
| 予想 vs 実績（/analytics） | 実績を入れた査定がグラフ・一覧に表示されるか |
| 4mini 鑑定・消耗品 | 解析結果に「オイル」「プラグ」等が含まれるとき、修理費に消耗品分が加算されるか |
| 在庫管理（/inventory） | 車両・パーツ一覧が取得でき、保管場所フィルターが動くか |

---

## 既知の制限（仕様）

- **BDS ブックマークレット**: 別オリジン（BDS サイト）から `/api/bds-import` に POST するため、Vercel の CORS 設定で許可が必要な場合があります。未設定だとブラウザでブロックされることがあります。
- **Drive 写真のプレビュー**: AI ズーム・インスペクションやリスク箇所のサムネイルは Google Drive のサムネイル URL を参照しています。Drive の仕様変更やアクセス制限で表示されない場合があります。
