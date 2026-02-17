# クライアントに見せる・デプロイ手順

**「クライアントに見せる」= 動いているサイトのURLを共有することです。**  
ソースコード（リポジトリ）をそのまま見せる必要はありません。デプロイすると、クライアントはブラウザでURLを開くだけで画面を見られます。

**Vercel** を使うと数分で公開できます。

---

## 1. デプロイ先の準備（Vercel の場合）

1. [Vercel](https://vercel.com) にログイン（GitHub 連携がおすすめ）
2. **Add New** → **Project** で、**このプロジェクトのコードが入っているリポジトリ**（GitHub などに置いたフォルダ）を選んでインポート
3. **Framework Preset**: Next.js のまま
4. **Root Directory**: そのまま（`./`）
5. **Build Command**: `npm run build`（デフォルト）
6. **Output Directory**: そのまま（Next.js が自動）

---

## 2. 環境変数（必須）

Vercel の **Project → Settings → Environment Variables** で、**本番（Production）** に以下を設定してください。

| 変数名 | 説明 | 注意 |
|--------|------|------|
| `GOOGLE_GEMINI_API_KEY` | AI Studio で発行したキー | クライアントに見せるだけなら無料枠で可 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase のプロジェクト URL | デモ用に別プロジェクトを推奨 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase のサービスロールキー | **絶対に秘匿**。Vercel には環境変数のみで設定 |

**クライアントデモ用のコツ**  
- 本番の Supabase / スプレッドシートを使いたくない場合は、**デモ用の Supabase プロジェクト**を 1 つ作り、そこだけ URL・キーを設定する  
- スプレッドシート連携を使わないなら `GOOGLE_SHEETS_SPREADSHEET_ID` は未設定でよい（その場合は Supabase に車両が 1 件以上ないと「車両が見つかりません」になります）

---

## 3. デプロイ実行

- **Deploy** をクリック
- ビルドが通れば、`https://あなたのプロジェクト名.vercel.app` で公開されます
- クライアントにはこの URL だけ共有すればOK

---

## 4. クライアントに渡すときのチェックリスト

- [ ] 環境変数に **本番の機密データ**（本番 Supabase、本番スプレッドシート）を入れていない（デモ用なら別プロジェクト推奨）
- [ ] Supabase の **マイグレーション**をデモ用プロジェクトで実行済み（`npx supabase db push` またはダッシュボードから）
- [ ] デモ用に **サンプル車両を 1〜2 件**入れておくと説明しやすい
- [ ] （任意）**カスタムドメイン**を Vercel で設定すると、`https://motexport-demo.example.com` のように見せやすい

---

## 5. ほかのデプロイ先

- **Netlify**: Next.js 対応。環境変数を設定して `npm run build` → `next start` ではなく Netlify の Next ランタイムを使用
- **自前サーバー**: `npm run build` → `npm run start` で `PORT=3000` など指定して起動。リバースプロキシ（nginx 等）で HTTPS 化

---

## 6. 見せ方のポイント

- **スマホで見せる**: 同じ URL をスマホで開く。PWA として「ホームに追加」するとアプリっぽく見える
- **ダークモード**: デフォルトがダークなので、そのまま見せて問題なし
- **写真解析**: デモ用車両に Drive の写真を入れておき、「写真を一括解析」で流れを見せられる

これでクライアントに「出せる」状態になります。
