# Vercel で見る手順（最短）

このフォルダから **Vercel にデプロイ**すると、ブラウザで URL を開くだけで画面を確認できます。GitHub は不要です。

---

## 「Supabase からの取得に失敗しました」が出たら（クイック対処）

Vercel の URL を開いて次のメッセージが出る場合:

- **Supabase からの取得に失敗しました**
- **Supabase 未設定のためスプレッドシートを表示しています**
- **Vercel で動かすには: プロジェクトの Settings → Environment Variables に…**

**原因**: Vercel には `.env.local` がデプロイされないため、環境変数が未設定です。

**対処（3ステップ）**:

1. [vercel.com](https://vercel.com) にログインし、**該当プロジェクト**を開く
2. **Settings** → **Environment Variables** で、次の2つを **必須**で追加（値はローカルの `.env.local` からコピー）
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Deployments** タブ → 最新デプロイの **⋯** → **Redeploy** を実行

再デプロイが終わると、同じ URL で Supabase から車両データが表示されます。その他の変数（Gemini・スプレッドシート・ブックマークレット用キーなど）は下記「4. 環境変数」を参照。

---

## Vercel で動かすためのチェックリスト

| やること | 詳細 |
|----------|------|
| 1. デプロイ | 下記「Vercel CLI でデプロイ」で `npx vercel` を実行 |
| 2. **環境変数を設定** | **必須**。Vercel には .env.local が送られないため、手動で同じ値を入れる（下記「4. 環境変数」） |
| 3. Redeploy | 環境変数追加・変更後は **Deployments → ⋯ → Redeploy** で再デプロイ |

**「接続OK」にならない・データが表示されない**場合は、ほぼ必ず 2 と 3 が未実施です。設定して Redeploy すれば動きます。

---

## 方法: Vercel CLI でデプロイ

### 1. ターミナルを開く

プロジェクトのフォルダで:

```powershell
cd c:\Users\user\Downloads\motorcycle-export-dashboard
```

### 2. Vercel にログイン

初回だけ実行:

```powershell
npx vercel login
```

表示に従い、**メールアドレス** または **GitHub** でログインします（ブラウザが開きます）。

### 3. デプロイする

```powershell
npx vercel
```

- 「Set up and deploy?」→ **Y** で Enter  
- 「Which scope?」→ 自分のアカウントを選んで Enter  
- 「Link to existing project?」→ **N**（新規プロジェクト）  
- 「What’s your project’s name?」→ そのまま Enter か、好きな名前（例: `motexport`）を入力  
- 「In which directory is your code located?」→ **./** のまま Enter  

しばらくすると **URL**（`https://〇〇.vercel.app`）が表示されます。その URL をブラウザで開くと、Vercel でサイトを見られます。

### 4. 環境変数（ここをしないと Vercel では動きません）

**ローカルでは .env.local を読むが、Vercel には .env.local はデプロイされません。**  
Vercel で「Supabase の設定がありません」になる場合は、次の手順で環境変数を追加してください。

1. [vercel.com](https://vercel.com) にログイン
2. **該当プロジェクト**（motorcycle-export-dashboard など）をクリック
3. 上タブの **Settings** → 左メニュー **Environment Variables**
4. **Key** と **Value** を入力して **Save**。

   **必須（この2つだけで車両一覧は表示できる）**

   | Key | 説明 |
   |-----|------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL（.env.local と同じ値） |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase の service_role キー（.env.local と同じ値） |

   **任意（使う機能に応じて追加）**

   | Key | いつ必要か |
   |-----|------------|
   | `GOOGLE_GEMINI_API_KEY` | 写真解析・AI査定を使うとき |
   | `GOOGLE_SHEETS_SPREADSHEET_ID` | Supabase が使えないときのスプレッドシート表示用 |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | スプレッドシート・Drive 連携を使うとき（1行JSON） |
   | `GOOGLE_DRIVE_PARENT_FOLDER_ID` | 車両写真を Drive の指定フォルダに保存するとき |
   | `GAMI_BOOKMARKLET_API_KEY` | ブックマークレットで既定キー以外を使うとき（**Key 名は GAMI_BOOKMARKLET_API_KEY**。GAMI_API_KEY では読まれません） |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 現状は未使用（RLS で anon はテーブル不可のため省略可） |

   **GOOGLE_SERVICE_ACCOUNT_JSON の入れ方（「JSON が不正です」を防ぐ）**
   - 環境変数は **1 行** しか入れられないので、JSON を 1 行にまとめてから貼る。
   - **簡単な方法** — プロジェクトフォルダで次を実行（パスは自分の JSON に合わせる）。Windows ではクリップボードにコピーされるので、Vercel の Value に Ctrl+V で貼るだけ。
     ```powershell
     node scripts/json-one-line.js c:\Users\user\Downloads\bikesiire-2356659e346f.json
     ```
     （npm を使う場合: `npm run env:oneline -- c:\Users\user\Downloads\bikesiire-2356659e346f.json`）
   - 手動でやる場合: エディタで JSON を開き、改行を削除して 1 行にする。`private_key` 内の **`\n`（バックスラッシュ+n の2文字）は消さない**。

5. **Environment** は **Production**（と Preview も使うならチェック）を選んで保存
6. **Deployments** タブ → 最新のデプロイの **⋯** → **Redeploy** で再デプロイ

再デプロイが終わると、本番 URL でも接続状況が「接続OK」になります。

---

## 本番デプロイ（オプション）

プレビューではなく「本番」の URL で出したい場合:

```powershell
npx vercel --prod
```

これで `https://〇〇.vercel.app` が本番として固定されます。

---

## 自動デプロイ（おすすめ）

手作業で `npx vercel` を叩かなくても、**push だけで自動デプロイ**できます。

### 方式A: Vercel の Git 連携（最も簡単）

- GitHub にリポジトリを作って push
- Vercel の「Import Project」でそのリポジトリを選ぶ
- 以後は **main への push = 自動デプロイ**

### 方式B: GitHub Actions で Vercel CLI を実行（このリポジトリに設定済み）

このリポジトリには **`.github/workflows/vercel-production.yml`** を追加してあります。  
GitHub の Secrets を入れると、**main への push で本番デプロイ**が走ります。

1. GitHub リポジトリを作成して、このプロジェクトを push（ブランチは `main` 推奨）
2. Vercel のプロジェクトを作成（または既存を使用）
3. GitHub リポジトリの Settings → Secrets and variables → Actions で以下を追加:
   - `VERCEL_TOKEN`（Vercel の Access Token）
   - `VERCEL_ORG_ID`（Vercel の Org ID）
   - `VERCEL_PROJECT_ID`（Vercel の Project ID）

※ `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` は、ローカルで一度 `npx vercel link` したときに作られる `.vercel/project.json` から確認できます。
