/**
 * .env.local が正しく読めるか確認するスクリプト。
 * プロジェクト直下で: node scripts/check-env.js
 * 値は表示せず「ある/ない」だけ出します。
 */
const fs = require("fs")
const path = require("path")

const envPath = path.join(__dirname, "..", ".env.local")
const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_SHEETS_SPREADSHEET_ID",
]

console.log(".env.local の場所:", envPath)
console.log("ファイルの存在:", fs.existsSync(envPath) ? "あり" : "なし")
if (!fs.existsSync(envPath)) {
  console.log("\n.env.local がありません。.env.example をコピーして .env.local を作成してください。")
  process.exit(1)
}

const content = fs.readFileSync(envPath, "utf8")
const lines = content.split(/\r?\n/)
const parsed = {}
for (const line of lines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eq = trimmed.indexOf("=")
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const value = trimmed.slice(eq + 1).trim()
  parsed[key] = value
}

console.log("\n変数ごとの状態:")
for (const key of keys) {
  const value = parsed[key]
  const status = value !== undefined && value !== "" ? "あり" : "なし"
  const note = value !== undefined && value !== "" && value.length > 10 ? `（${value.length}文字）` : ""
  console.log(`  ${key}: ${status} ${note}`)
}

const missing = keys.filter((k) => !parsed[k] || parsed[k] === "")
if (missing.length > 0) {
  console.log("\n※ 上で「なし」の変数は、= の右に値を貼り付けて保存してください。")
  console.log("※ 変数名はコピペで写すと確実です（スペースや typo に注意）。")
}
