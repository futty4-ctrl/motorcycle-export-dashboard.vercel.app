// LINE Messaging API クライアント（送信）。
// メッセージ組み立ては純関数（テスト可能）／実送信は fetch ラッパ（要 access token）。

const LINE_API = "https://api.line.me/v2/bot"

export interface QuickReplyItem {
  label: string
  text: string
}

export interface LineTextMessage {
  type: "text"
  text: string
  quickReply?: {
    items: Array<{ type: "action"; action: { type: "message"; label: string; text: string } }>
  }
}

/** テキストメッセージを組み立てる（クイックリプライ任意） */
export function textMessage(text: string, quickReplies?: QuickReplyItem[]): LineTextMessage {
  const msg: LineTextMessage = { type: "text", text }
  if (quickReplies && quickReplies.length > 0) {
    msg.quickReply = {
      items: quickReplies.map((q) => ({
        type: "action",
        action: { type: "message", label: q.label, text: q.text },
      })),
    }
  }
  return msg
}

/** かかる/かからない/不明・あり/なし/不明 など定番のクイックリプライ */
export const QR_ENGINE: QuickReplyItem[] = [
  { label: "かかる", text: "かかる" },
  { label: "かからない", text: "かからない" },
  { label: "不明", text: "不明" },
]
export const QR_DOCS: QuickReplyItem[] = [
  { label: "あり", text: "あり" },
  { label: "なし", text: "なし" },
  { label: "不明", text: "不明" },
]

export function getAccessToken(): string {
  const t = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!t) throw new Error("LINE_CHANNEL_ACCESS_TOKEN 未設定")
  return t
}

async function post(path: string, token: string, body: unknown): Promise<void> {
  const res = await fetch(`${LINE_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`LINE API ${path} ${res.status}: ${detail.slice(0, 200)}`)
  }
}

/** replyToken で返信（ヒアリング中の応答＝push課金外） */
export function replyMessage(
  token: string,
  replyToken: string,
  messages: LineTextMessage[]
): Promise<void> {
  return post("/message/reply", token, { replyToken, messages })
}

/** userId へ push（査定額送信・予約確定・リマインド） */
export function pushMessage(
  token: string,
  to: string,
  messages: LineTextMessage[]
): Promise<void> {
  return post("/message/push", token, { to, messages })
}
