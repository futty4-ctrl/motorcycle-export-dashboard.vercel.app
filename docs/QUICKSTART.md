# はじめて使うときの手順

## 1. 依存関係を入れる

```bash
npm install
```

## 2. 環境変数を用意する

```bash
cp .env.example .env.local
```

`.env.local` を開き、**最低限**次のどちらかを設定します。

### パターンA: まず画面だけ見たい（データはモック）

- 何も書かなくても起動はできます。
- ダッシュボードには「設定がありません」の案内と、サマリーカード（入札中・在庫数など）のサンプル数値が表示されます。車両一覧は空です。

### パターンB: 車両データを表示したい

**Supabase だけ設定する場合（推奨・手軽）**

1. [Supabase](https://supabase.com) でアカウント作成 → 新規プロジェクト作成
2. プロジェクトの **Settings → API** を開く
3. 次の2つを `.env.local` にコピー
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL=`
   - **service_role** のキー（Reveal で表示）→ `SUPABASE_SERVICE_ROLE_KEY=`
4. マイグレーションでテーブルを作る（プロジェクト直下で実行）

   ```bash
   npx supabase link --project-ref あなたのプロジェクトID
   npx supabase db push
   ```

   （`supabase link` が面倒な場合は、Supabase ダッシュボードの **SQL Editor** で `supabase/migrations` 内の `.sql` を順に実行しても可）

5. ダッシュボードに「車両がありません」と出ればOK。車両は後から「車両追加」やアップロードで増やせます。

**スプレッドシートも使う場合**

- `.env.example` の **GOOGLE_SHEETS_SPREADSHEET_ID** と **GOOGLE_SERVICE_ACCOUNT_JSON**（または **GOOGLE_APPLICATION_CREDENTIALS**）を設定
- スプレッドシートに「車両」「サマリー」シートを作成し、サービスアカウントのメールに編集権限を付与  
  → 詳しくは [docs/SETUP_AND_INTEGRATION.md](SETUP_AND_INTEGRATION.md)

### パターンC: 写真解析・査定（AI）も試したい

- [Google AI Studio](https://aistudio.google.com/apikey) で API キーを発行
- `.env.local` に `GOOGLE_GEMINI_API_KEY=あなたのキー` を追加
- 車両詳細ページで「写真解析」や「BDS査定」が使えるようになります。

---

## 3. 起動する

```bash
npm run dev
```

ブラウザで **http://localhost:3000** を開く。

---

## 4. 起動後にできること

| やること | 必要な設定 |
|----------|------------|
| ダッシュボード・設定画面を見る | なし（そのまま） |
| 車両一覧を表示・追加・ステータス変更 | Supabase |
| スプレッドシートで車両・サマリー表示 | Supabase + スプレッドシート + サービスアカウント |
| 写真解析・BDS査定・利益シミュ | Supabase + Gemini API（+ Drive で写真） |
| 古物台帳へ1行追加 | Supabase + スプレッドシート（落札時に代金・相手方入力） |

**おすすめの試し方**

1. まず **何も設定せず** `npm run dev` → 画面とサマリーを確認
2. **Supabase だけ**設定して `db push` → もう一度起動し、車両0台の状態を確認
3. 必要なら **Gemini API** を追加して、車両1台登録 → 写真解析や査定を試す

不明な点は [README.md](../README.md) や [SETUP_AND_INTEGRATION.md](SETUP_AND_INTEGRATION.md) も参照してください。
