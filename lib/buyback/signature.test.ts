import { describe, it, expect } from "vitest"
import crypto from "node:crypto"
import { verifyLineSignature } from "./signature"

const secret = "testsecret"
const body = '{"events":[]}'
const good = crypto.createHmac("sha256", secret).update(body).digest("base64")

describe("verifyLineSignature", () => {
  it("正しい署名を受理", () => {
    expect(verifyLineSignature(secret, body, good)).toBe(true)
  })
  it("ボディ改ざんを拒否", () => {
    expect(verifyLineSignature(secret, body + " ", good)).toBe(false)
  })
  it("誤った署名を拒否", () => {
    expect(verifyLineSignature(secret, body, "AAAABBBBCCCC")).toBe(false)
  })
  it("署名なし(null/undefined)を拒否", () => {
    expect(verifyLineSignature(secret, body, null)).toBe(false)
    expect(verifyLineSignature(secret, body, undefined)).toBe(false)
  })
})
