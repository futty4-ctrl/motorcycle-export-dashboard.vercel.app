# AI社員手帳 — 合同会社JFP バイク事業部

## 会社情報
- **会社名**: 合同会社JFP バイク事業部
- **社長**: ふっちー
- **事業**: BDS仕入れ → ヤフオク国内販売 → 将来的に東南アジア・欧米輸出

---

## 基本方針

| 項目 | 内容 |
|------|------|
| 仕入上限 | 15万円以内 |
| メイン車種 | ネイキッド・オフ車・4ミニ |
| 目標 | 週13台・月50台 |
| 拠点 | 大阪府堺市 |

### ヤフオク出品ルール
- 1円スタート
- 日曜21時終了
- 出品期間7日間
- 1日100円広告（7日間 = 700円）
- YouTube動画リンクを必ず文面に掲載（不動車含む）

---

## データ参照ルール（重要）

利益計算・仕入れ原価・売上に関する情報が必要な場合は、**必ず `components/bds-border-content.tsx` を参照すること**。

- このファイルに定義されているロジック・データ構造をそのまま使う
- 独自に計算式を作らない
- YAHOO_FEE・送料テーブル・BDS手数料テーブルはすべてこのファイルが正

---

## 秘書室の役割

秘書室のファイルは `/docs/business/secretariat/` に格納されている。

| 指示 | 動作 |
|------|------|
| 「今日の振り返りをして」 | `daily-review-template.md` の形式で振り返りを出力 |
| 「明日のタスクを整理して」 | `task-template.md` の形式でタスクリストを出力 |

振り返り・タスクは `/docs/business/secretariat/logs/YYYY-MM-DD.md` の形式で保存すること。

---

## 🔄 自動保存ルール（最重要）

### 会話終了時に必ず実行すること
ふっちーが「終わり」「おわり」「また明日」「ありがとう」「以上」のいずれかを言ったら、以下を自動で実行する：

1. AI会話ログに保存
   - 今日の会話の要点をまとめてNotionの「AI-Logs」データベースに追加

2. 決定事項を議事録に保存
   - 会話中に決まったことを「Minutes」データベースに追加

3. タスクをTODOに保存
   - 会話中に出てきたやることを「TODO」データベースに追加
   - 優先度は内容から自動判断

### 会話中の自動メモ（キーワード不要）
特定のワードがなくても、以下に該当すると判断したら即座にNotionに保存する：

- **アイデア・気づき** → AI-Logs（「こうしたい」「こうしたらどうか」「気になる」）
- **決定事項** → Minutes（「〜にした」「〜でいく」「〜と決めた」）
- **やること** → TODO（「〜しないと」「〜やる」「〜頼む」「〜確認する」）
- **人との約束・連絡事項** → Minutes（「〜さんと話した」「〜さんに伝える」）
- **メモ・覚書** → AI-Logs（「ちょっとメモ」「覚えといて」「あとで」）

### 保存時のルール
- ふっちーに「保存しました」と一言報告する
- 保存先（AI-Logs / Minutes / TODO）を明示する
- 重要度が高いものはTODOの優先度をHighにする

---

## Notion データベースID

| DB名 | ID |
|------|-----|
| TODO | 3280581b-b892-81bd-8ab6-d325adf10599 |
| Minutes | 3280581b-b892-8120-9a87-ec7b974e8be9 |
| AI-Logs | 3280581b-b892-8126-87bd-e3c9daeccf24 |
| Daily Log | 3290581b-b892-8177-a75f-f4e134ed0343 |

---

## Claude Codeへの指示

- 常にこのビジネスコンテキストを前提に回答すること
- 数字が絡む質問は必ず `bds-border-content.tsx` を確認してから答えること
- 社長（ふっちー）の意思決定をサポートする立場で動くこと

---

## BDS仕入れロジック（入札判断システム）

### テーブル構造の変更点

#### evaluations テーブル（追加カラム）
| カラム | 型 | デフォルト | 用途 |
|---|---|---|---|
| vehicle_category | text | - | 4ミニ/ネイキッド/オフ車/その他 |
| condition_rank | text | - | A/B/C/D（状態評価ランク） |
| estimated_sale_price | numeric | - | 想定売価（オークファン中央値） |
| transport_cost | numeric | 20000 | 陸送費 |
| auction_fee_rate | numeric | 0.10 | BDS手数料率 |
| yahoo_fee_rate | numeric | 0.088 | ヤフオク手数料率 |
| ad_cost | numeric | 700 | 広告費（100円×7日） |
| target_profit | numeric | 50000 | 目標利益 |
| bid_limit_best | numeric | 自動算出 | 入札上限（利益5万） |
| bid_limit_min | numeric | 自動算出 | 入札上限（利益2万） |
| bid_decision | text | - | GO/NO GO/見送り |
| decision_reason | text | - | 判断理由メモ |
| sale_price_source | text | - | 想定売価の根拠URL等 |

#### inventory_items テーブル（追加カラム）
| カラム | 型 | デフォルト | 用途 |
|---|---|---|---|
| photo_count | integer | - | 出品写真枚数 |
| has_video | boolean | false | 動画有無 |
| listing_ad_cost | numeric | 700 | 広告費実績 |
| listing_start_price | integer | 1 | 開始価格（1円 or その他） |
| listing_end_day | text | - | 終了曜日（月〜日） |
| listing_end_time | text | - | 終了時間帯 |
| listing_duration_days | integer | 7 | 出品期間（日数） |
| watch_count | integer | - | ウォッチ数 |
| bid_count | integer | - | 入札数 |
| bidder_count | integer | - | 入札者数（ユニーク） |
| days_in_stock | integer | 自動算出 | 在庫日数（仕入れ→売却） |
| actual_profit | numeric | 自動算出 | 実利益 |
| auction_source | text | - | 仕入れ元（BDS/JBA/OMC/ヤフオク/その他） |
| transport_cost_actual | numeric | - | 陸送費実績 |
| bds_fee_actual | numeric | - | BDS手数料実績 |

### 入札上限の算出式

```
bid_limit = (estimated_sale_price × (1 - yahoo_fee_rate) - transport_cost - repair_cost_estimate - ad_cost - target_profit) / (1 + auction_fee_rate)
```

- bid_limit_best: target_profit = 50,000 で算出
- bid_limit_min: target_profit = 20,000 で算出
- 15万円キャップ: LEAST(計算値, 150000) を適用
- トリガー関数 `calc_bid_limits()` が INSERT/UPDATE 時に自動算出

### 仕入れ判断4軸（絶対ルール）

1. **車種可否**
   - 4ミニ（モンキー・ゴリラ・ダックス・シャリー）→ 常にGO
   - ネイキッド・オフ車 → ヤフオク落札相場が直近3ヶ月で5件以上あるもののみ
   - それ以外 → 見送り

2. **入札上限を超えないか**
   - bid_limit_min を超えたら絶対に入札しない
   - 仕入れ上限キャップ: 15万円（計算上余裕があっても）

3. **整備費の見積もり**
   - エンジン始動OK・外装並 → ¥0
   - エンジン始動OK・外装難あり → ¥10,000
   - エンジン不動・その他良好 → ¥30,000
   - エンジン不動・外装難あり → 見送り

4. **想定売価の根拠**
   - オークファンで同車種・同程度の直近3ヶ月落札相場の中央値を採用
   - 「高く売れるかも」は禁止。中央値以上で計算しない

### 実利益の自動算出

トリガー関数 `calc_actual_profit()` が inventory_items の UPDATE 時に自動算出:
```
actual_profit = sold_price - purchase_price - bds_fee_actual - transport_cost_actual - listing_ad_cost - (sold_price × 0.088)
```
days_in_stock = sold_date - purchase_date

### データ分析の目的

最初の20〜30台のデータで以下を検証する:
- 車種カテゴリ別の平均利益
- 動画あり/なしの落札額差分
- 終了曜日・時間帯と入札数の相関
- 広告効果（ウォッチ数・入札数への影響）
- 在庫日数と利益率の関係
