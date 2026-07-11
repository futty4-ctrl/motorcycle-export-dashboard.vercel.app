import { describe, it, expect } from "vitest"
import { textMessage, QR_ENGINE } from "./line-client"

describe("textMessage", () => {
  it("素のテキスト（クイックリプライなし）", () => {
    expect(textMessage("こんにちは")).toEqual({ type: "text", text: "こんにちは" })
  })
  it("クイックリプライ付き（かかる/かからない/不明）", () => {
    const m = textMessage("エンジンはかかりますか？", QR_ENGINE)
    expect(m.text).toBe("エンジンはかかりますか？")
    expect(m.quickReply?.items).toHaveLength(3)
    expect(m.quickReply?.items[0]).toEqual({
      type: "action",
      action: { type: "message", label: "かかる", text: "かかる" },
    })
  })
  it("空配列ならクイックリプライを付けない", () => {
    expect(textMessage("x", []).quickReply).toBeUndefined()
  })
})
