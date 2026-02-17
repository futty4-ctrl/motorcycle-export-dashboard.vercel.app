# 請求書・見積逆算ツール（別プロジェクト用）

このフォルダは、**請求書テンプレート** と **見積逆算ツール** を別の Next.js プロジェクトで使うための一式です。

## 必要な環境

- **Next.js 14+**（App Router）
- **TypeScript**
- **Tailwind CSS**
- **lucide-react**
- **shadcn/ui** の以下のコンポーネント:
  - Card, CardContent, CardHeader, CardTitle
  - Button, Input, Label
  - Table, TableBody, TableCell, TableHead, TableHeader, TableRow
  - Select, SelectContent, SelectItem, SelectTrigger, SelectValue

## 取り込み手順

### 1. ファイルをコピー

- `app/invoice/` → あなたのプロジェクトの `app/invoice/`
- `app/quote/` → あなたのプロジェクトの `app/quote/`
- `lib/quote-tool/` → あなたのプロジェクトの `lib/quote-tool/`

### 2. レイアウトの差し替え

エクスポートしたページは **サイドバーなしの単体レイアウト** です。

- **請求書** (`app/invoice/page.tsx`): 冒頭の `<Link href="/">` をあなたのアプリのトップ（例: `/dashboard`）に変更するか、自分のレイアウトでラップしてください。
- **見積逆算** (`app/quote/page.tsx`): 同様に戻りリンクを変更し、必要なら共通レイアウトでラップしてください。

現在は次のような構造です。

```tsx
<div className="flex min-h-screen flex-col bg-background">
  <header>…戻りリンクのみ</header>
  <main>…</main>
</div>
```

既存の `DashboardHeader` / `DesktopSidebar` / `MobileBottomNav` を使う場合は、エクスポート版の該当部分をあなたのレイアウトコンポーネントに差し替えてください。

### 3. 印刷用 CSS

請求書・見積プレビューを印刷するとき、余計な UI を隠すために **globals.css** に以下を追加してください。

```css
@media print {
  body * {
    visibility: hidden;
  }
  .invoice-sheet,
  .invoice-sheet * {
    visibility: visible;
  }
  .invoice-sheet {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 210mm;
    padding: 15mm;
    box-shadow: none;
    border: none;
  }
  .quote-preview,
  .quote-preview * {
    visibility: visible;
  }
  .quote-preview {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 210mm;
    padding: 15mm;
  }
}
```

### 4. ルートの追加（任意）

ナビゲーションにリンクを足す場合の例です。

- 請求書: `/invoice`
- 見積逆算: `/quote`

## 含まれる機能

### 請求書 (`/invoice`)

- 御請求書タイトル、請求日、請求先、振込先、件名、明細表（摘要・数量・単価・金額）、小計・消費税・合計
- 印刷 / PDF 保存（ブラウザの印刷ダイアログ）
- サンプルデータは `SAMPLE` 定数を編集して変更

### 見積逆算ツール (`/quote`)

- グループ別明細（作業費・運搬費・その他）、行タイプ（固定・単価・Auto・調整）
- 消費税 10%、端数処理（1/10/100/1000円・切捨/切上/四捨五入）、目標税込総額での Auto 配分
- プリセット（2t車、作業員、階段割増など）でワンクリック追加
- 見積書プレビューと印刷

## 注意

- `_export-invoice-and-quote` はこのリポジトリではビルド対象に含めず、**コピー用** としてのみ利用してください。
- 別プロジェクトにコピーしたあと、パス（`@/components/...` 等）があなたのプロジェクト構成に合っているか確認してください。
