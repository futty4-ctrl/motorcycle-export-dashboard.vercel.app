# アプリの構成・見方

## 起動して見る

1. ターミナルでプロジェクトフォルダに移動
   ```bash
   cd c:\Users\user\Downloads\motorcycle-export-dashboard
   ```
2. 開発サーバーを起動
   ```bash
   npm run dev
   ```
   または（`next` がグローバルにない場合）
   ```bash
   npx next dev --turbo
   ```
3. ブラウザで開く
   - **http://localhost:3000** にアクセス

---

## 画面構成

### トップ（/）— ダッシュボード

| エリア | 内容 |
|--------|------|
| **ヘッダー** | ダッシュボードタイトル・日付 |
| **サマリーカード 3 枚** | 入札中 / 在庫数 / 月間利益（Supabase またはスプレッドシートの「サマリー」から取得。未設定時はフォールバック値） |
| **車両パイプライン** | ステータスフィルタ（すべて・仕入中・在庫あり・出品中・発送中・売却済）＋ 車両カード一覧 |
| **車両カード** | サムネ・名前・年・走行距離・評価・ステータス・利益スコア（プログレスバー）・予想利益。Drive リンクがある車両には「カメラ」ボタン（撮影→Drive にアップロード） |
| **右下 FAB（+）** | 「車両を追加」「写真をアップロード」→ 写真をアップロードは /upload へ |
| **サイドバー / 下ナビ** | PC は左サイドバー、スマホは下部ナビ |

- 車両データは **Supabase の vehicles** を優先して取得。未設定・エラー時は **スプレッドシート「車両」** のデータを表示。

### /upload — 写真アップロード

- 大きな「タップして撮影 or 画像を選択」エリア → スマホではカメラ or ギャラリー起動
- 選択後：進捗バー表示 → Drive に新規フォルダ作成＋画像保存 → DB（drive_uploads）に URL 保存
- 完了後：「Drive で開く」「ダッシュボードに戻る」ボタン

### 404（存在しないパス）

- `app/not-found.tsx` の「ページが見つかりません」＋ ダッシュボードに戻るリンク

---

## 主な機能とデータの流れ

| 機能 | トリガー | 連携先 |
|------|----------|--------|
| 車両一覧表示 | ページ読み込み | Supabase vehicles + scenarios → または スプレッドシート「車両」 |
| サマリー表示 | ページ読み込み | スプレッドシート「サマリー」 |
| 車両追加 | FAB → 車両を追加 | スプレッドシートに行追加、Drive に車両IDフォルダ作成、フォルダURLをシートに書き戻し |
| 車両カードの写真 | カメラアイコン | その車両の Drive フォルダ（vehicles.drive_link）に直接アップロード |
| 写真アップロード画面 | FAB → 写真をアップロード または /upload 直アクセス | Drive 親フォルダ内に新規フォルダ作成＋画像保存、drive_uploads に URL 保存 |
| BDS 査定・利益比較 | （画面から呼び出す Server Action） | Gemini API、為替 API、修理費マスター |

---

## フォルダ構成（抜粋）

```
app/
  page.tsx           # ダッシュボード
  upload/page.tsx    # 写真アップロード
  actions/           # Server Actions（vehicles, drive-upload, evaluate）
  layout.tsx
  globals.css
components/          # ダッシュボードヘッダー、車両カード、車両リスト、FAB、サマリーなど
lib/                 # データ取得・Drive・Supabase・査定・利益計算など
public/              # manifest.json（PWA）、アイコン（任意）
supabase/migrations/ # DB 初期テーブル・drive_uploads
docs/                # SETUP_AND_INTEGRATION.md, PWA_SETUP.md, 本ファイル
```

環境変数や Supabase/スプレッドシートの設定がまだの場合は、ダッシュボードで「フォールバックデータを表示しています」などのメッセージや、車両 0 台の表示になります。`.env.local` と `docs/SETUP_AND_INTEGRATION.md` を設定すると本番に近い表示になります。
