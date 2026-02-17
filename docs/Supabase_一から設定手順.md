# Supabase を一から設定する手順

「Supabase からの取得に失敗しました」「Supabase 未設定のためスプレッドシートを表示しています」と出る場合の、**最初から**の説明と手順です。

---

## このメッセージの意味

- このアプリは **車両データの取得先** を次の順で試します。
  1. **Supabase**（PostgreSQL）をまず使う
  2. Supabase が使えない → **Google スプレッドシート** に切り替える

- 「Supabase からの取得に失敗しました」＝ **Supabase への接続ができなかった** という意味です。
- 「Supabase 未設定のためスプレッドシートを表示しています」＝ **Supabase 用の設定（環境変数）がない or 間違っている** ため、代わりにスプレッドシートを表示している、という意味です。

Supabase を使いたい場合は、**環境変数を正しく設定**する必要があります。

---

## 必要な環境変数（2つだけ）

ローカルでは、プロジェクト直下の **`.env.local`** に次の **2つ** が必ず必要です。

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase の「Project URL」（例: `https://xxxx.supabase.co`） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の「service_role」のキー（長い文字列） |

- どちらかが **空** や **未設定** だと「Supabase 未設定」と判定されます。
- **名前の typo**（例: `SUPABASE_SERVICE_KEY` と書く）でも読めないので、**コピペ** で正確に書きましょう。

---

## 手順 1：Supabase のプロジェクトを用意する

1. ブラウザで **https://supabase.com** を開く。
2. ログイン（GitHub 等で OK）。
3. **「New project」** で新規プロジェクトを作るか、既存の **プロジェクトを選択** する。
   - 新規の場合は「Organization」→「Project name」「Database Password」を入力して作成。
   - 作成完了まで 1〜2 分かかることがあります。

---

## 手順 2：URL とキーをコピーする

1. Supabase の左メニューで **Settings（歯車アイコン）** をクリック。
2. **API** をクリック。
3. 次の 2 つをコピーする。

### ① Project URL

- 画面の **「Project URL」** の右に表示されている URL をそのままコピー。
- 例: `https://abcdefghijk.supabase.co`
- これが **`NEXT_PUBLIC_SUPABASE_URL`** の値です。

### ② service_role キー

- 下の方の **「Project API keys」** の表で、**`service_role`** の行を探す。
- キーは隠れているので、**「Reveal」** をクリックして表示させる。
- 表示された **長い文字列**（`eyJ...` で始まる）をコピー。
- これが **`SUPABASE_SERVICE_ROLE_KEY`** の値です。

⚠️ **注意**: `anon`（匿名）キーではなく、必ず **`service_role`** のキーを使います。`service_role` は権限が強いので、Git に上げたり他人に渡したりしないでください。

---

## 手順 3：.env.local に書く

1. プロジェクトの **直下**（`package.json` がある場所）に **`.env.local`** というファイルを開く（なければ新規作成）。
2. 次の 2 行を **追加または修正** する。値は手順 2 でコピーしたものに置き換える。

```env
NEXT_PUBLIC_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxx...（Revealで表示した長い文字列）
```

**書くときのポイント**

- `=` の **右側だけ** に値を書く。左側の変数名は変更しない。
- 値の **前後にスペースや `"` を付けない**。
- 1 行に 1 つずつ。改行して 2 行で書く。

**悪い例**

```env
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

**良い例**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...
```

---

## 手順 3.5：書いているのに「未設定」と出るときの診断

**.env.local に正しく書いているのに「Supabase 未設定」と出る場合**は、次のどちらかです。

1. **サーバーに環境変数が渡っていない**（再起動忘れ・別フォルダで実行・BOM など）
2. **環境変数は渡っているが、Supabase 側で失敗している**（テーブル未作成・プロジェクト一時停止など）

**診断のしかた**

1. `npm run dev` を**一度止めてから**もう一度起動する。
2. ブラウザで **http://localhost:3000/api/env-check** を開く。
3. 表示を確認する：
   - **両方「設定あり」** → 環境変数は読めている。Supabase の **テーブル作成（マイグレーション）** や **プロジェクトの一時停止** を確認する。
   - **どちらか「未設定」** → サーバーに渡っていない。`.env.local` が **プロジェクト直下**（`package.json` と同じ場所）にあるか、**保存してから** `npm run dev` を再起動したか確認する。

---

## 手順 4：開発サーバーを再起動する

`.env.local` は **起動時** にしか読み込まれません。

1. いま動いている **`npm run dev` を止める**（ターミナルで Ctrl+C）。
2. もう一度 **`npm run dev`** を実行する。

```powershell
npm run dev
```

3. ブラウザで **http://localhost:3000** を開き直す。

---

## ここまででどうなるか

- **2 つの環境変数が正しく設定されていれば**  
  → Supabase に接続され、車両一覧が Supabase のデータで表示されます（まだテーブルが空なら「車両がありません」などになります）。

- **まだ「Supabase からの取得に失敗しました」と出る場合**
  - **env_missing**（未設定）: `.env.local` の変数名や値をもう一度確認。**再起動** したかも確認。
  - **error**（接続エラー）: URL や service_role キーが **別のプロジェクトのもの** になっていないか、Supabase のダッシュボードで **API が有効** か確認。

---

## データベースのテーブルについて

初めての Supabase プロジェクトの場合、**vehicles** などのテーブルがまだないことがあります。このプロジェクトでは **マイグレーション** でテーブルを作ります。

1. `supabase/migrations/` フォルダ内の `.sql` ファイルを、Supabase ダッシュボードの **SQL Editor** で順に実行する  
   または  
2. Supabase CLI を使っている場合は `supabase db push` でマイグレーションを適用する  

テーブルがないと「接続はできるがデータが取れない」状態になるので、マイグレーションの適用も忘れずに行ってください。

---

## `supabase login` で device_code エラーが出る場合

「device_code: Invalid」などと出るときは、**アクセストークン**で認証できます。

1. ブラウザで **https://supabase.com/dashboard/account/tokens** を開く（Supabase にログインした状態で）
2. **Generate new token** でトークンを作成し、表示された値をコピー
3. ターミナルで環境変数にセットしてから `link` と `db push` を実行（PowerShell の例）:
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "ここにコピーしたトークンを貼る"
   cd c:\Users\user\Downloads\motorcycle-export-dashboard
   npx supabase link --project-ref あなたのプロジェクトID
   npx supabase db push
   ```
4. プロジェクトIDは Supabase の Project URL（`https://xxxx.supabase.co`）の `xxxx` の部分、または Settings → General の Reference ID

---

## まとめ

| やること | 詳細 |
|----------|------|
| 1. Supabase でプロジェクトを用意 | https://supabase.com で New project または既存プロジェクト選択 |
| 2. URL と service_role キーをコピー | Settings → API で Project URL と service_role の Reveal |
| 3. .env.local に 2 行書く | `NEXT_PUBLIC_SUPABASE_URL=...` と `SUPABASE_SERVICE_ROLE_KEY=...` |
| 4. npm run dev を再起動 | .env.local を読むため必ず再起動 |

これで「Supabase 未設定のためスプレッドシートを表示しています」は解消し、Supabase から取得できるようになります。
