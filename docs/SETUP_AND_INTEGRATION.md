# 連携・セットアップ一覧

ここまでで実装した機能について、**連携しないといけないこと**と**こちらで用意するもの**をまとめています。

---

## 1. こちらで用意するもの

### 1.1 環境変数用ファイル

- **`.env.local`**  
  - ルートに作成し、`.env.example` をコピーして必要な値を埋める。  
  - **Git にコミットしない**（`.gitignore` に `.env*.local` が含まれている想定）。

### 1.2 Google Cloud 周り（Sheets / Drive 用）

| 用意するもの | 取得・作成方法 |
|--------------|----------------|
| **Google Cloud プロジェクト** | [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成。 |
| **サービスアカウント** | 上記プロジェクトで「API とサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」で作成。 |
| **サービスアカウントの JSON キー** | 該当サービスアカウントの「キー」タブから「鍵を追加」→「新しい鍵」→「JSON」でダウンロード。 |
| **有効化する API** | 同じプロジェクトで「API とサービス」→「ライブラリ」から **Google Sheets API** と **Google Drive API** を有効化。 |

→ 認証は **google-auth-library / googleapis** で、この JSON（またはそのパス）を使って行います。

### 1.3 Google スプレッドシート

| 用意するもの | 内容 |
|--------------|------|
| **スプレッドシート** | 車両管理用の 1 ブックを作成。 |
| **シート「車両」** | 1 行目：ヘッダー。2 行目以降：1 行 = 1 台。列は以下を想定。 |
| | A: id, B: 名前, C: 年, D: 画像URL, E: ステータス, F: 利益スコア, G: 予想利益円, H: 予想利益USD, I: 走行距離, J: オークション評価, **K: フォルダURL** |
| **シート「サマリー」** | 1 行目：ヘッダー（入札中, 在庫数, 月間利益円, 月間利益USD）。2 行目：数値のみ。 |
| **共有** | スプレッドシートを、サービスアカウントのメール（`xxx@xxx.iam.gserviceaccount.com`）に **編集者** で共有。 |

**シート「車両」に書く内容（1行目＝ヘッダー、2行目以降＝データ）**

| A | B | C | D | E | F | G | H | I | J | K |
|---|--:|--:|---|--------|--:|-----:|-----:|--------|--------------|-------------|
| id | 名前 | 年 | 画像URL | ステータス | 利益スコア | 予想利益円 | 予想利益USD | 走行距離 | オークション評価 | フォルダURL |
| （例）1 | Kawasaki Z900RS | 2022 | /bikes/1.jpg | 出品中 | 82 | 185000 | 1234 | 12400 km | 4.5 | （空欄でOK・車両追加で自動入力） |

- **ステータス**: 仕入中 / 在庫あり / 出品中 / 発送中 / 売却済 のいずれか。
- **K列（フォルダURL）**: 手動で書かなくてよい。アプリの「車両を追加」で行追加時に自動で Drive フォルダURL が入ります。
- 車両がまだない場合は **1行目だけヘッダー** を入れておけばOK。2行目は空でも動きます。

**シート「サマリー」に書く内容（1行目＝ヘッダー、2行目＝数値1行）**

| A | B | C | D |
|---|--:|-----:|-----:|
| 入札中 | 在庫数 | 月間利益円 | 月間利益USD |
| 12 | 47 | 2840000 | 18933 |

- 2行目は **数値だけ**（入札中の件数、在庫数、月間利益円、月間利益USD）。初期値は 0 でよいです。

**方法A: GAS で一発セットアップ（おすすめ）**

1. 車両管理用の **新規スプレッドシート** を開く。
2. メニュー **拡張機能** → **Apps Script**。
3. プロジェクト内の **`gas/setupSpreadsheet.gs`** の内容をコピーし、Apps Script のエディタに貼り付けて **保存**。
4. 関数のプルダウンで **`setupDashboardSheets`** を選び、**実行**（▶）。
5. 初回は「権限を確認」→ 自分の Google アカウントを選び「許可」。
6. 「設定完了しました」と出たら終わり。**「車両」「サマリー」シートとヘッダーが自動作成**されています。あとは **直接シートを編集** するだけです。

**方法B: 手動でヘッダーを書く**

上記の表のとおり、1行目にヘッダーを入力し、車両は2行目以降・サマリーは2行目に数値を入力します。

### 1.4 Google Drive（車両フォルダ・写真アップロード用）

| 用意するもの | 内容 |
|--------------|------|
| **親フォルダ（任意だが推奨）** | 車両用フォルダやアップロード先の「入れ物」になるフォルダを 1 つ作成。 |
| **共有** | そのフォルダを、サービスアカウントのメールに **編集者** で共有。 |
| **フォルダ ID** | フォルダを開いたときの URL の `https://drive.google.com/drive/folders/【ここがID】` の部分を控える。 |

→ 車両追加で「車両ID」フォルダを作る場所、および `/upload` の写真アップロード先として使います。

### 1.5 Supabase

| 用意するもの | 内容 |
|--------------|------|
| **Supabase プロジェクト** | [Supabase](https://supabase.com) でプロジェクト作成。 |
| **API 情報** | ダッシュボード「Settings」→「API」で **Project URL** と **anon key** / **service_role key** を控える。 |
| **マイグレーション実行** | `supabase/migrations/` 内の SQL を実行（ダッシュボードの SQL Editor に貼り付けて実行で可）。 |
| | 実行するファイル：`20260213000000_initial_vehicle_tables.sql` → `20260214000000_drive_uploads.sql`。 |

→ 車両・査定・シナリオ・パーツ・**drive_uploads** を保存する DB として連携します。

### 1.6 Gemini API（BDS 査定・利益比較用）

| 用意するもの | 内容 |
|--------------|------|
| **API キー** | [Google AI Studio](https://aistudio.google.com/apikey) で「Create API key」してキーを発行。 |

→ BDS テキスト/画像の解析と、ヤフオク vs eBay の利益比較で使用。

### 1.7 PWA アイコン（任意）

| 用意するもの | 内容 |
|--------------|------|
| **icon-192.png** | 192×192px の PNG。`public/icon-192.png` に配置。 |
| **icon-512.png** | 512×512px の PNG。`public/icon-512.png` に配置。 |

→ 未配置でもアプリは動きますが、ホーム画面に追加したときのアイコンはブラウザ既定になります。

### 1.8 車両カード用画像（任意）

| 用意するもの | 内容 |
|--------------|------|
| **プレースホルダー画像** | 例: `public/bikes/placeholder.jpg`。未設定時はコード上のパスで 404 になる場合あり。 |

---

## 2. 連携しないといけないこと（やる順）

### 2.1 環境変数を実際に設定する

`.env.local` に以下を設定します。

| 変数 | 必須/任意 | 用途 |
|------|-----------|------|
| **GOOGLE_SHEETS_SPREADSHEET_ID** | スプレッドシートを使うなら必須 | 車両・サマリー取得、車両追加時の行追加・フォルダURL書き戻し |
| **GOOGLE_SERVICE_ACCOUNT_JSON** または **GOOGLE_APPLICATION_CREDENTIALS** | 上記を使うなら必須 | Sheets / Drive 認証 |
| **GOOGLE_DRIVE_PARENT_FOLDER_ID** | 車両追加・写真アップロードで推奨 | 車両フォルダ・アップロード先の親フォルダ |
| **NEXT_PUBLIC_SUPABASE_URL** | Supabase を使うなら必須 | フロント・サーバー両方から Supabase に接続 |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | 同上 | ブラウザ用 Supabase クライアント |
| **SUPABASE_SERVICE_ROLE_KEY** | 同上 | サーバー用（車両取得・drive_uploads 保存など） |
| **GOOGLE_GEMINI_API_KEY** | BDS 査定・利益比較を使うなら必須 | Gemini API 呼び出し |
| **GEMINI_MODEL** | 任意 | 未設定時は `gemini-2.5-flash` |
| **FALLBACK_USD_JPY** | 任意 | 為替取得失敗時のフォールバック（未設定なら 150） |

### 2.2 スプレッドシートとサービスアカウントの連携

1. スプレッドシートの **共有** に、サービスアカウントのメールを **編集者** で追加。  
2. `.env.local` の **GOOGLE_SHEETS_SPREADSHEET_ID** に、そのスプレッドシートの ID（URL の `/d/` と `/edit` の間）を設定。  
3. 認証は **GOOGLE_SERVICE_ACCOUNT_JSON**（JSON を 1 行で貼り付け）または **GOOGLE_APPLICATION_CREDENTIALS**（JSON ファイルのパス）のどちらかで連携。

### 2.3 Drive とサービスアカウントの連携

1. 車両用・アップロード用の **親フォルダ** を Drive で作成し、サービスアカウントのメールを **編集者** で共有。  
2. そのフォルダの **ID** を `.env.local` の **GOOGLE_DRIVE_PARENT_FOLDER_ID** に設定。  
→ 車両追加時の「車両ID」フォルダ作成と、`/upload` の「新規フォルダ作成＋画像保存」がこの親の下で行われます。

### 2.4 Supabase とアプリの連携

1. Supabase で **マイグレーション 2 本** を実行（上記 1.5 のとおり）。  
2. `.env.local` に **NEXT_PUBLIC_SUPABASE_URL** / **NEXT_PUBLIC_SUPABASE_ANON_KEY** / **SUPABASE_SERVICE_ROLE_KEY** を設定。  
3. ダッシュボードの車両一覧は **Supabase の vehicles（＋ scenarios）** を優先して取得。未設定・エラー時は **スプレッドシート** にフォールバック。

### 2.5 データの流れの整理（どのデータをどこに入れるか）

- **車両の登録**  
  - FAB「車両を追加」→ スプレッドシートに 1 行追加 ＋ Drive に「車両ID」フォルダ作成 ＋ フォルダURL をシートに書き戻し。  
  - **Supabase の `vehicles` には自動では入りません。** スプレッドシートと Supabase を両方使う場合は、手動で Supabase にも同じ車両を入れるか、別途「シートから Supabase へ同期」処理を用意する必要があります。
- **写真アップロード**  
  - `/upload` でアップロード → Drive に新規フォルダ作成＋画像保存 → **drive_uploads** にファイル URL を保存。  
  - 車両カードの「カメラ」ボタン → **その車両の既存 Drive フォルダ**（`vehicles.drive_link`）に直接アップロード（drive_uploads には保存していない実装）。

必要なら「車両追加時に Supabase の vehicles にも 1 件 insert する」などの連携を追加すると、車両一覧と Drive がそろいます。

### 2.6 BDS 査定・利益比較の連携

- **GOOGLE_GEMINI_API_KEY** を `.env.local` に設定すると、BDS 査定とヤフオク vs eBay の利益比較が利用可能になります。  
- 為替は自動取得。失敗時は **FALLBACK_USD_JPY**（未設定なら 150）で円換算します。

### 2.7 PWA（ホーム画面に追加）の連携

- **HTTPS** で配信（Vercel 等は標準で HTTPS）。  
- `public/manifest.json` と `app/layout.tsx` のマニフェスト・アイコン設定は済み。  
- アイコンを使う場合は **public/icon-192.png** と **public/icon-512.png** を用意（詳細は `docs/PWA_SETUP.md`）。

---

## 3. 機能ごとの依存関係（まとめ）

| 機能 | 必要な連携・用意 |
|------|------------------|
| **車両一覧（Supabase）** | Supabase プロジェクト作成・マイグレーション実行・3 つの環境変数。必要なら vehicles にデータ投入。 |
| **車両一覧（スプレッドシート）** | スプレッドシート作成・「車両」シートの列構成・共有・GOOGLE_SHEETS_SPREADSHEET_ID と認証。 |
| **車両追加（FAB）** | 上記スプレッドシート ＋ Drive API ＋ 認証。任意で GOOGLE_DRIVE_PARENT_FOLDER_ID。 |
| **車両カードの写真ボタン** | Supabase の vehicles に drive_link が入っていること。Drive 認証。 |
| **写真アップロード画面（/upload）** | Drive 認証 ＋ **GOOGLE_DRIVE_PARENT_FOLDER_ID**。Supabase（drive_uploads 用）の 3 変数。 |
| **BDS 査定・利益比較** | GOOGLE_GEMINI_API_KEY。為替は自動（任意で FALLBACK_USD_JPY）。 |
| **PWA** | 本番は HTTPS。任意で icon-192/512。 |

---

## 4. 最小構成で動かす場合

- **スプレッドシートのみ使う**  
  - GOOGLE_SHEETS_SPREADSHEET_ID ＋ GOOGLE_SERVICE_ACCOUNT_JSON（または CREDENTIALS）。  
  - スプレッドシートの「車両」「サマリー」を用意・共有。  
- **Supabase のみ使う**  
  - Supabase の 3 変数 ＋ マイグレーション実行。  
  - 車両一覧は Supabase から表示（vehicles に手動または別手段でデータ投入）。  
- **写真アップロード（/upload）を使う**  
  - 上記に加えて **GOOGLE_DRIVE_PARENT_FOLDER_ID** と Drive 用の同じ認証。  

このように、**連携しないといけないこと**は「環境変数」「スプレッドシート/Drive の共有と ID」「Supabase の作成とマイグレーション」「必要ならデータ投入」、**用意するもの**は「各種アカウント・キー・スプレッドシート・Drive フォルダ・アイコン等」です。
