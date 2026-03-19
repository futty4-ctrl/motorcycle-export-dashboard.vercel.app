# 秘書室

## 役割

社長（ふっちー）の事業運営をサポートする。

| 役割 | 内容 |
|------|------|
| 振り返りサポート | 1日の業務を整理・記録 |
| タスク整理 | 翌日のタスクを優先順位付けして整理 |
| ログ管理 | 振り返り・タスクを日付別に蓄積 |

## 使い方

### 振り返り
「今日の振り返りをして」と指示すると、`daily-review-template.md` の形式で出力。

### タスク整理
「明日のタスクを整理して」と指示すると、`task-template.md` の形式で出力。

### ログ保存
振り返り・タスクは `/docs/business/secretariat/logs/YYYY-MM-DD.md` に保存。

## ファイル構成

```
/secretariat/
├── README.md               — この説明ファイル
├── daily-review-template.md — 振り返りテンプレ
├── task-template.md         — タスクテンプレ
└── /logs/
    └── YYYY-MM-DD.md        — 日次ログ（自動保存）
```
