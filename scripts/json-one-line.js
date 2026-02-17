/**
 * JSON ファイルを1行にまとめ、標準出力しつつ Windows ではクリップボードにもコピーします。
 * Vercel の GOOGLE_SERVICE_ACCOUNT_JSON に貼る際に使用。
 *
 * 使い方: pnpm run env:oneline -- <JSONのパス>
 * 例: pnpm run env:oneline -- c:\Users\user\Downloads\bikesiire-xxx.json
 */

const fs = require("fs");
const { spawnSync } = require("child_process");
const path = process.argv[2];
if (!path) {
  console.error("使い方: pnpm run env:oneline -- <JSONファイルのパス>");
  process.exit(1);
}
const json = fs.readFileSync(path, "utf8");
const parsed = JSON.parse(json);
const oneLine = JSON.stringify(parsed);

if (process.platform === "win32") {
  spawnSync("clip", [], { input: oneLine, stdio: ["pipe", "ignore", "ignore"] });
  console.error("1行にしました。クリップボードにコピー済み → Vercel の Value に Ctrl+V で貼ってください。");
}
console.log(oneLine);
