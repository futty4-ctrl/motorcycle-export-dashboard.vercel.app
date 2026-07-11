import crypto from "node:crypto"

/**
 * LINE Messaging API の署名検証（X-Line-Signature）。
 * channelSecret を鍵に、リクエスト生ボディの HMAC-SHA256(base64) と一致するか。
 * タイミング安全比較。署名なし・長さ不一致は false。
 */
export function verifyLineSignature(
  channelSecret: string,
  rawBody: string,
  signature: string | null | undefined
): boolean {
  if (!signature) return false
  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
