# 相場ボード 計算エンジン Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** BDS/JBA向け「上限落札額・3ゾーン判定」を出す純関数エンジンを、完全手数料モデル＋弱気売値＋BDS評価点補正で実装する。

**Architecture:** 副作用ゼロの純TS関数群（`lib/soba/`）。会場マスタ・手数料定数はconfigに集約。外部依存（aucfan/Supabase/UI）なし＝単体でテスト可能。後続のパイプライン/ビューはこのエンジンを呼ぶだけ。

**Tech Stack:** TypeScript / Vitest（新規導入）。設計書：`docs/superpowers/specs/2026-07-11-soba-board-design.md`

## Global Constraints

- 純関数のみ（I/O・fetch・DB禁止）。全額は「円・整数」で扱う（丸めは表示層でなく計算層でも明示）
- 金額はすべて**税別ベースで受け取り、消費税10%は式内で明示適用**
- BDS落札料（B会員・税別）：5万未満¥4,200／10万未満¥5,500／20万未満¥6,900／30万未満¥7,400／40万未満¥8,200／50万未満¥8,800／60万未満¥9,600／80万未満¥10,200／100万未満¥11,200／100万以上¥12,200
- JBA落札料（税別）：5万未満¥4,400／20万未満¥6,600／50万未満¥8,800
- ヤフオク手数料¥1,980（固定）／広告費¥700（既定ON）／名義代 月¥3,000（per台＝÷月間台数）／整備 工賃¥1,500/h＋部品
- 送料（会場×車体・既定・≤125cc標準）：BDS堺¥1,000／JBA神戸¥1,500／関東・神奈川¥10,000／九州¥13,000。バルキー車(ジャイロ等)・>125ccは割増（未設定は要確認フラグ）
- 目標粗利 既定¥20,000／回転フロア＝仕入値×15%
- 弱気売値＝実売分布の下位30%（p30）

---

### Task 0: Vitest 導入

**Files:**
- Modify: `package.json`（devDeps: vitest, scripts: "test": "vitest run", "test:watch": "vitest"）
- Create: `vitest.config.ts`

- [ ] Step1: `npm i -D vitest` を実行
- [ ] Step2: `vitest.config.ts` 作成（`test: { environment: 'node', include: ['lib/**/*.test.ts'] }`）
- [ ] Step3: package.json に `"test": "vitest run"` 追加
- [ ] Step4: `npx vitest run` が「no test files」で正常終了することを確認
- [ ] Step5: commit `chore: add vitest`

---

### Task 1: config（会場マスタ・手数料定数）

**Files:**
- Create: `lib/soba/config.ts`
- Test: `lib/soba/config.test.ts`

**Produces:** `AUCTION_FEES` (BDS/JBA 落札料ブラケット配列), `VENUES` (会場マスタ), `FEE_CONST` (yahoo/ad/meigi/laborRate), `TARGET_PROFIT=20000`, `TURN_FLOOR_RATE=0.15`

- [ ] Step1: 落札料ブラケットを `{ underYen: number|null, fee: number }[]` で定義（BDS/JBA）。テスト：配列長・境界値の存在をassert
- [ ] Step2: 会場マスタ `VENUES: Record<string,{shippingByClass}>` 定義（堺/神戸/関東/九州/神奈川）
- [ ] Step3: 定数（TARGET_PROFIT, TURN_FLOOR_RATE, YAHOO_FEE=1980, AD_FEE=700, MEIGI_MONTHLY=3000, LABOR_RATE=1500）
- [ ] Step4: `npx vitest run lib/soba/config.test.ts` PASS
- [ ] Step5: commit `feat(soba): fee config and venue master`

---

### Task 2: 落札料ブラケット関数 `getOtoshimeryo(venue, hammerYen)`

**Files:**
- Create: `lib/soba/fees.ts`
- Test: `lib/soba/fees.test.ts`

**Produces:** `getOtoshimeryo(auction: 'BDS'|'JBA', hammerYen: number): number`

- [ ] Step1: テスト先書き — BDS ¥60,000→¥5,500／¥84,000→¥5,500／¥45,000→¥4,200／¥150,000→¥6,900／¥250,000→¥7,400。JBA ¥60,000→¥6,600／¥40,000→¥4,400
- [ ] Step2: 落札金額の帯を線形探索して落札料を返す実装
- [ ] Step3: 境界テスト（ちょうど¥50,000は「10万未満」帯へ＝未満判定）
- [ ] Step4: PASS確認
- [ ] Step5: commit `feat(soba): getOtoshimeryo bracket lookup`

---

### Task 3: 仕入原価・手数料合計 `calcCosts(input)`

**Files:**
- Modify: `lib/soba/fees.ts`
- Test: `lib/soba/fees.test.ts`

**Consumes:** `getOtoshimeryo`, config
**Produces:** `calcCosts(i: CostInput): { shiireTaxIncl, sellSideFees, total }` — CostInput = { auction, venue, vehicleClass, hammerYen, salePrice, seibiCost, monthlyUnits, includeAd }

- [ ] Step1: テスト — BDS堺・アドレス・落札¥55,000・月20台・整備0・広告ON：仕入原価=(55,000+5,500)×1.1 + 送料1,000 + 名義(3,000/20=150)。売却側=1,980+700。数値をassert
- [ ] Step2: 実装（仕入原価=(hammer+落札料)×1.1＋送料＋名義/台、売却側=yahoo+ad+seibi）
- [ ] Step3: 送料未設定（会場×車体）は例外 or `{shippingUnknown:true}` を返すテスト
- [ ] Step4: PASS
- [ ] Step5: commit `feat(soba): calcCosts full fee model`

---

### Task 4: 上限落札額 逆算 `calcMaxBid(input)`

**Files:**
- Create: `lib/soba/evaluate.ts`
- Test: `lib/soba/evaluate.test.ts`

**Consumes:** `calcCosts`, `getOtoshimeryo`
**Produces:** `calcMaxBid(i: { auction, venue, vehicleClass, salePrice, targetProfit, seibiCost, monthlyUnits, includeAd }): number`

- [ ] Step1: テスト — 目標粗利を残す最大の落札額を返す。落札料が帯依存＝候補帯を試して整合する解を採る。例：BDS堺・売値¥73,000・目標¥20,000で上限落札額を計算しassert（手計算値）
- [ ] Step2: 実装（落札料を仮置き→逆算→出た落札額の帯で落札料再取得→一致するまで最大2-3回反復）
- [ ] Step3: 整合しない/負値は0を返すテスト
- [ ] Step4: PASS
- [ ] Step5: commit `feat(soba): calcMaxBid reverse solve`

---

### Task 5: 弱気売値 `conservativeSalePrice(dist)` ＋ 評価点補正 `gradeAdjust(median, grade)`

**Files:**
- Create: `lib/soba/pricing.ts`
- Test: `lib/soba/pricing.test.ts`

**Produces:** `conservativeSalePrice(sales: number[]): number`（p30）／`gradeAdjust(base: number, grade: number): number`（6点=1.0基準・±1点±6%目安）

- [ ] Step1: テスト — p30（例：[50,60,70,80,90,100]k→p30≈64k、線形補間）／gradeAdjust(70000,8)>70000, (70000,4)<70000
- [ ] Step2: 実装（percentile線形補間・grade係数テーブル or 線形）
- [ ] Step3: 空配列は0・grade範囲外はクランプ、のテスト
- [ ] Step4: PASS
- [ ] Step5: commit `feat(soba): conservative price + grade adjust`

---

### Task 6: 整備後売値・整備コスト `seibiModel(input)`

**Files:**
- Modify: `lib/soba/pricing.ts`
- Test: `lib/soba/pricing.test.ts`

**Produces:** `seibiCost(hours: number, partsYen: number): number`（hours×1500+parts）／`seibiAdjustedPrice(basePrice: number, premium: number): number`

- [ ] Step1: テスト — seibiCost(3, 6000)=10,500／seibiAdjustedPrice(73000, 20000)=93,000
- [ ] Step2: 実装
- [ ] Step3: PASS
- [ ] Step4: commit `feat(soba): seibi cost & premium`

---

### Task 7: 3ゾーン判定＋統合 `evaluateBike(input)`

**Files:**
- Modify: `lib/soba/evaluate.ts`
- Test: `lib/soba/evaluate.test.ts`

**Consumes:** all above
**Produces:** `evaluateBike(i): { zone:'green'|'yellow'|'red', maxBidTarget, maxBidBreakeven, expectedProfit, roi, shippingUnknown }` — ゾーン境界＝落札額 vs 目標ライン(粗利20k)/回転ライン(仕入×15%)/赤字ライン(breakeven)

- [ ] Step1: テスト — アドレス実例：弱気売値・整備後で、落札¥53,000→🟡、¥60,000→🔴、目標到達額→🟢 をassert（設計書§4の例に整合）
- [ ] Step2: 実装（目標/回転/赤字の3上限を出し、想定落札額 or 現下代でゾーン判定）
- [ ] Step3: shippingUnknown時は判定保留フラグを返すテスト
- [ ] Step4: PASS
- [ ] Step5: commit `feat(soba): evaluateBike zone classification`

---

## 次のサブ計画（別ファイル・別セッション可）
- **① aucfanパイプライン**（要ふっちー：aucfanログイン維持・Supabase接続）→ 相場分布・整備プレミアム・評価点相関を相場DBへ・Vercel cron・fail-loud
- **③ 会場ビュー**（スマホ・型式検索・会場別上限・判定色・鮮度警告）
