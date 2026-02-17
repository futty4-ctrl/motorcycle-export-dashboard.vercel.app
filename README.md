# MotoExport Pro - バイク輸出ダッシュボード

日本のバイク（4mini 等）の仕入れ・査定・利益比較（ヤフオク車体 vs eBay パーツバラし）を行うダッシュボードです。  
Tailwind + shadcn/ui、スマホ（PWA）優先のダークモード UI。

## 起動方法

```bash
npm install
cp .env.example .env.local   # 環境変数を編集
npm run dev
```

ブラウザで **http://localhost:3000** を開く。

## 環境変数（最小）

`.env.local` に以下を設定してください。雛形は `.env.example` を参照。

| 変数 | 説明 |
|------|------|
| `GOOGLE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) で発行。写真解析・査定に必須。 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトの URL。 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase のサービスロールキー（サーバー専用・秘匿すること）。 |

スプレッドシート・Drive 連携を使う場合は `GOOGLE_SHEETS_SPREADSHEET_ID` とサービスアカウント認証（`GOOGLE_SERVICE_ACCOUNT_JSON` または `GOOGLE_APPLICATION_CREDENTIALS`）を追加。

## DB マイグレーション（Supabase）

Bad Case 機能などを使う場合:

```bash
npx supabase db push
# または
npx supabase migration up
```

## クライアントに見せる・デプロイ

**URLで共有したい場合**は [docs/DEPLOY_FOR_CLIENT.md](docs/DEPLOY_FOR_CLIENT.md) を参照。Vercel なら数分で公開でき、クライアントに渡すときのチェックリスト付きです。

## ドキュメント

- **実装サマリ**: [docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)
- **足りてないところ・TODO**: [docs/GAPS_AND_TODO.md](docs/GAPS_AND_TODO.md)
- **月50台の費用目安**: [docs/COST_ESTIMATE_50_VEHICLES.md](docs/COST_ESTIMATE_50_VEHICLES.md)
- **サイト構成・見た目**: [docs/SITE_PREVIEW.md](docs/SITE_PREVIEW.md)
- **クライアント向けデプロイ**: [docs/DEPLOY_FOR_CLIENT.md](docs/DEPLOY_FOR_CLIENT.md)

**運用のヒント**: Gemini API の利用量を抑えるため、Google Cloud の[請求アラート](https://console.cloud.google.com/billing/alerts)を設定しておくと安心です。

## 技術スタック

- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Supabase (PostgreSQL), Google Gemini API, Google Drive / Sheets（任意）, Exchange Rate API
