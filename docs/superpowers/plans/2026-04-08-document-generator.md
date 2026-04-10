# 帳票発行システム（見積書・請求書・領収書）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MotoExport Proに帳票発行機能を追加。見積書・請求書・領収書をdocx形式で生成し、角印（山上.png）を自動挿入する。発行元は山上/合同会社JFPの2プリセット切り替え。

**Architecture:** API Route（`/api/documents/generate`）でdocx-jsを使いサーバーサイド生成。フロントエンドは4タブUI（履歴・見積書・請求書・領収書）。Supabaseに`documents`テーブル + `issuer_presets`テーブル。角印PNGはpublic/seal.pngを使用。

**Tech Stack:** Next.js 16 App Router, docx (npm), Supabase, ui-system.ts design tokens

**Existing code to know about:**
- `components/ui-system.ts` — デザイントークン（C.surface, C.orange, etc）とスタイルヘルパー（card, btn, inp, lbl, badge, etc）
- `lib/supabase.ts` — ブラウザ用Supabaseクライアント
- `lib/supabase/server.ts` — サーバー用Supabaseクライアント（`createServerSupabaseClient()`）
- `components/sidebar.tsx:50-58` — 管理グループのメニュー項目
- `public/seal.png` — 角印画像（山上）
- `C:\Users\user\Downloads\template.js` — 帳票生成ロジックの元コード（これをTypeScriptに移植）

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `types/document.ts` | 型定義（DocumentRecord, IssuerPreset, EstimateData, InvoiceData, ReceiptData） |
| `lib/document-generator.ts` | template.jsをTypeScript移植。docx生成コア（generateEstimate/Invoice/Receipt） |
| `lib/documents.ts` | Supabase CRUD（documents + issuer_presets テーブル） |
| `app/api/documents/generate/route.ts` | API Route: docx生成→バイナリ返却 |
| `components/document-form.tsx` | 帳票発行フロントUI（4タブ: 履歴/見積書/請求書/領収書） |
| `app/doc-generator/page.tsx` | ページラッパー（/doc-generator） |

### Modified Files
| File | Change |
|------|--------|
| `components/sidebar.tsx` | 「帳票発行」メニュー追加（管理グループ） |
| `components/desktop-sidebar.tsx` | 「帳票発行」メニュー追加 |

### DB Migration (Supabase SQL Editor で手動実行)
- `documents` テーブル作成
- `issuer_presets` テーブル作成 + 初期データ（yamanoue, jfp のみ。soejimaは除外）
- Storage バケット作成（document-stamps, generated-documents）

---

## Task 1: DB Migration + npm install

**Files:**
- Run SQL in Supabase Dashboard
- Modify: `package.json`

- [ ] **Step 1: Supabase SQL Editorでマイグレーション実行**

以下のSQLをSupabase SQL Editorで実行（kobutsu_ledger, kobutsu_settingsは既存なので、documents + issuer_presets + storage部分のみ）:

```sql
-- 帳票発行テーブル
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('見積書', '請求書', '領収書')),
  doc_number TEXT,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT NOT NULL,
  client_address TEXT,
  total_amount INTEGER NOT NULL DEFAULT 0,
  issuer_preset TEXT DEFAULT 'yamanoue',
  detail_json JSONB DEFAULT '{}',
  file_url TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(doc_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_name);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_full_access" ON documents
  FOR ALL USING (true) WITH CHECK (true);

-- 発行元プリセットテーブル
CREATE TABLE IF NOT EXISTS issuer_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT,
  address TEXT,
  tel TEXT,
  person TEXT,
  bank_name TEXT,
  bank_type TEXT DEFAULT '普通',
  bank_number TEXT,
  bank_holder TEXT,
  stamp_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE issuer_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issuer_presets_full_access" ON issuer_presets
  FOR ALL USING (true) WITH CHECK (true);

-- 初期プリセット（副島商会は除外）
INSERT INTO issuer_presets (id, name, display_name, address, person) VALUES
  ('yamanoue', '山上', '山　上', '大阪府守口市7-8', '担当 山田'),
  ('jfp', '合同会社JFP', '合同会社JFP', '大阪府守口市八雲西町2-1-27', '担当 山田')
ON CONFLICT (id) DO NOTHING;

-- Storageバケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-stamps', 'document-stamps', false)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-documents', 'generated-documents', false)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: docxパッケージをインストール**

```bash
cd /c/Users/user/Downloads/motorcycle-export-dashboard && npm install docx
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add docx dependency for document generation"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `types/document.ts`

- [ ] **Step 1: 型定義ファイルを作成**

```typescript
// types/document.ts

export interface DocumentRecord {
  id: string
  created_at: string
  doc_type: '見積書' | '請求書' | '領収書'
  doc_number: string | null
  doc_date: string
  client_name: string
  client_address: string | null
  total_amount: number
  issuer_preset: string
  detail_json: Record<string, unknown>
  file_url: string | null
  notes: string | null
}

export interface IssuerPreset {
  id: string
  name: string
  display_name: string | null
  address: string | null
  tel: string | null
  person: string | null
  bank_name: string | null
  bank_type: string | null
  bank_number: string | null
  bank_holder: string | null
  stamp_image_url: string | null
}

export interface EstimateItem {
  name: string
  detail?: string
  total: number
  qty?: string
  unit?: string
}

export interface EstimateData {
  client: string
  date: string
  validUntil: string
  schedule: string
  items: EstimateItem[]
  note?: string
  issuerPreset?: string
}

export interface InvoiceItem {
  name: string
  qty: string
  unit: string
  price: number
  amount: number
  note?: string
}

export interface InvoiceData {
  client: string
  clientAddress?: string
  invoiceNo?: string
  date: string
  dueDate: string
  items: InvoiceItem[]
  note?: string
  bank?: {
    name: string
    type: string
    number: string
    holder: string
  }
  issuerPreset?: string
}

export interface ReceiptData {
  client: string
  amount: number
  description: string
  date: string
  breakdown?: {
    subtotal: number
    tax: number
  }
  issuerPreset?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add types/document.ts
git commit -m "feat: add document type definitions"
```

---

## Task 3: Supabase CRUD (lib/documents.ts)

**Files:**
- Create: `lib/documents.ts`

- [ ] **Step 1: CRUD関数を作成**

```typescript
// lib/documents.ts
import { supabase } from './supabase'
import type { DocumentRecord, IssuerPreset } from '@/types/document'

// === Documents ===

export async function getDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('doc_date', { ascending: false })
  return { data: data as DocumentRecord[] | null, error }
}

export async function getDocument(id: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as DocumentRecord | null, error }
}

export async function createDocument(doc: Partial<DocumentRecord>) {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single()
  return { data: data as DocumentRecord | null, error }
}

export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
  return { error }
}

export async function searchDocuments(term: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .or(`client_name.ilike.%${term}%,doc_number.ilike.%${term}%`)
    .order('doc_date', { ascending: false })
  return { data: data as DocumentRecord[] | null, error }
}

// === Issuer Presets ===

export async function getIssuerPresets() {
  const { data, error } = await supabase
    .from('issuer_presets')
    .select('*')
    .order('id')
  return { data: data as IssuerPreset[] | null, error }
}

export async function getIssuerPreset(id: string) {
  const { data, error } = await supabase
    .from('issuer_presets')
    .select('*')
    .eq('id', id)
    .single()
  return { data: data as IssuerPreset | null, error }
}

export async function updateIssuerPreset(id: string, preset: Partial<IssuerPreset>) {
  const { data, error } = await supabase
    .from('issuer_presets')
    .update(preset)
    .eq('id', id)
    .select()
    .single()
  return { data: data as IssuerPreset | null, error }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/documents.ts
git commit -m "feat: add documents Supabase CRUD operations"
```

---

## Task 4: Document Generator (template.js → TypeScript移植)

**Files:**
- Create: `lib/document-generator.ts`

- [ ] **Step 1: template.jsをTypeScriptに移植**

`C:\Users\user\Downloads\template.js` の3つの関数（generateEstimate, generateInvoice, generateReceipt）をそのまま移植。レイアウト・スタイル変更なし。

主な変更点:
- `require("docx")` → `import {} from "docx"`
- `require("fs")` → stamp画像はfetch(`/seal.png`)でBufferを取得
- companyBlock: IssuerPresetからデータ取得（ハードコードの「山上」ではなく）
- 全関数にTypeScript型注釈追加
- `stampImage()` → 引数でBufferを受け取る形に変更

ファイルの内容はtemplate.jsの334行の完全移植。docxライブラリのAPI（Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType）をそのまま使用。

- [ ] **Step 2: ビルド確認**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add lib/document-generator.ts
git commit -m "feat: port template.js to TypeScript document generator"
```

---

## Task 5: API Route (docx生成エンドポイント)

**Files:**
- Create: `app/api/documents/generate/route.ts`

- [ ] **Step 1: API Routeを作成**

POSTリクエストでdocType + dataを受け取り、docxバイナリを返却。同時にdocumentsテーブルに記録を保存。

```typescript
// app/api/documents/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateDocument } from '@/lib/document-generator'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { docType, data } = await req.json()
  
  // 1. 発行元プリセット取得
  const supabase = createServerSupabaseClient()
  const { data: issuer } = await supabase
    .from('issuer_presets')
    .select('*')
    .eq('id', data.issuerPreset || 'yamanoue')
    .single()
  
  // 2. 角印画像取得（public/seal.png）
  const stampRes = await fetch(new URL('/seal.png', req.url))
  const stampBuffer = stampRes.ok ? Buffer.from(await stampRes.arrayBuffer()) : null
  
  // 3. docx生成
  const buffer = await generateDocument(docType, data, issuer, stampBuffer)
  
  // 4. documentsテーブルに記録
  const totalAmount = /* dataから算出 */
  await supabase.from('documents').insert({
    doc_type: docType,
    doc_date: data.date || new Date().toISOString().split('T')[0],
    client_name: data.client,
    client_address: data.clientAddress || null,
    total_amount: totalAmount,
    issuer_preset: data.issuerPreset || 'yamanoue',
    detail_json: data,
  })
  
  // 5. docxバイナリ返却
  const filename = `${docType}_${data.client || 'output'}.docx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
```

- [ ] **Step 2: ビルド確認**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add app/api/documents/generate/route.ts
git commit -m "feat: add document generation API route"
```

---

## Task 6: フロントエンドUI (document-form.tsx)

**Files:**
- Create: `components/document-form.tsx`
- Create: `app/doc-generator/page.tsx`

- [ ] **Step 1: document-form.tsxを作成**

4タブUI:
1. **発行履歴** — documentsテーブルから取得、種別バッジ（見積書=blue, 請求書=orange, 領収書=green）、再ダウンロード・削除
2. **見積書作成** — 宛名, 日付, 有効期限, 作業日程, 明細（動的行追加）, 発行元選択, 備考
3. **請求書作成** — 宛名, 宛名住所, 請求番号, 日付, 支払期限, 明細（動的行追加）, 振込先, 発行元選択, 備考
4. **領収書作成** — 宛名, 金額, 但し書き, 日付, 内訳（自動逆算）, 発行元選択

デザイン: ui-system.ts の C オブジェクト + スタイルヘルパー（card, btn, inp, lbl, badge, etc）を使用。
パターン: invoice-editor.tsxと同様のuseState + フォーム + API呼び出し。

発行元ドロップダウン: issuer_presetsテーブルから取得（useEffectで初回ロード）。
生成ボタン: POST `/api/documents/generate` → レスポンスをBlobでダウンロード。

- [ ] **Step 2: ページラッパーを作成**

```typescript
// app/doc-generator/page.tsx
import DocumentForm from "@/components/document-form"

export default function DocumentGeneratorPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{
            margin: 0, fontFamily: "'DM Sans', sans-serif",
            fontWeight: 800, fontSize: 22, color: "#f5f5f5", letterSpacing: "-0.02em",
          }}>
            帳票発行
          </h1>
          <span style={{
            fontFamily: "monospace", fontSize: 11, color: "#525252", letterSpacing: "0.1em",
          }}>
            DOCUMENTS
          </span>
        </div>
        <p style={{
          margin: "6px 0 0", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#a3a3a3",
        }}>
          見積書・請求書・領収書の作成・発行ができます。
        </p>
      </div>
      <DocumentForm />
    </div>
  )
}
```

- [ ] **Step 3: ビルド確認**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add components/document-form.tsx app/doc-generator/page.tsx
git commit -m "feat: add document generator UI with 4-tab form"
```

---

## Task 7: Sidebar Navigation追加

**Files:**
- Modify: `components/sidebar.tsx:50-58`
- Modify: `components/desktop-sidebar.tsx:22-34`

- [ ] **Step 1: sidebar.tsxに帳票発行メニュー追加**

管理グループ（Line 50-58あたり）に追加:
```
{ href: "/doc-generator", icon: "📄", label: "帳票発行" }
```

「請求書・見積書」(Line 53 /invoices) の下、「古物台帳」(Line 54 /kobutsu) の下あたりに配置。

- [ ] **Step 2: desktop-sidebar.tsxにも追加**

メニュー配列（Line 22-34あたり）に追加:
```
{ label: "帳票発行", href: "/doc-generator", icon: FileText }
```

- [ ] **Step 3: ビルド確認**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add components/sidebar.tsx components/desktop-sidebar.tsx
git commit -m "feat: add document generator to sidebar navigation"
```

---

## Task 8: 統合テスト + 最終確認

- [ ] **Step 1: dev server起動して各タブ動作確認**

```bash
npm run dev
```

ブラウザで `/doc-generator` を開き:
- 見積書タブ: フォーム入力 → 生成 → docxダウンロード確認
- 請求書タブ: フォーム入力 → 生成 → docxダウンロード確認
- 領収書タブ: フォーム入力 → 生成 → docxダウンロード確認
- 発行履歴タブ: 生成した帳票が一覧に表示されること確認
- 発行元切り替え: 山上 ↔ JFP で情報が変わること確認
- 角印: docx内に山上.pngが挿入されていること確認

- [ ] **Step 2: 最終Commit + Push**

```bash
git add -A
git commit -m "feat: 帳票発行システム完成（見積書・請求書・領収書 docx生成）"
git push origin main
```
