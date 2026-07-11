import { describe, it, expect } from "vitest"
import { parseLwCommand, checkAmount } from "./commands"

describe("parseLwCommand", () => {
  it("裸の数字 = 直近pendingへの査定", () => {
    expect(parseLwCommand("45000")).toEqual({ kind: "quote", caseNo: null, amount: 45000 })
  })
  it("案件ID付き査定", () => {
    expect(parseLwCommand("B012 45000")).toEqual({ kind: "quote", caseNo: "B012", amount: 45000 })
  })
  it("小文字bも大文字化・カンマ許容", () => {
    expect(parseLwCommand("b12 45,000")).toEqual({ kind: "quote", caseNo: "B12", amount: 45000 })
  })
  it("OK/ok = confirm", () => {
    expect(parseLwCommand("OK")).toEqual({ kind: "confirm" })
    expect(parseLwCommand(" ok ")).toEqual({ kind: "confirm" })
  })
  it("NG（案件指定あり/なし）", () => {
    expect(parseLwCommand("NG")).toEqual({ kind: "decline", caseNo: null })
    expect(parseLwCommand("B012 NG")).toEqual({ kind: "decline", caseNo: "B012" })
  })
  it("> テキスト = 客へ転送", () => {
    expect(parseLwCommand("> 明日は雨みたいです")).toEqual({ kind: "forward", text: "明日は雨みたいです" })
  })
  it("完了（金額あり/なし・案件指定）", () => {
    expect(parseLwCommand("完了")).toEqual({ kind: "complete", caseNo: null, amount: null })
    expect(parseLwCommand("完了 43000")).toEqual({ kind: "complete", caseNo: null, amount: 43000 })
    expect(parseLwCommand("B012 完了 43,000")).toEqual({ kind: "complete", caseNo: "B012", amount: 43000 })
  })
  it("保留", () => {
    expect(parseLwCommand("保留")).toEqual({ kind: "hold", caseNo: null })
    expect(parseLwCommand("B012 保留")).toEqual({ kind: "hold", caseNo: "B012" })
  })
  it("空・意味不明は unknown", () => {
    expect(parseLwCommand("   ").kind).toBe("unknown")
    expect(parseLwCommand("よろしく").kind).toBe("unknown")
  })
})

describe("checkAmount", () => {
  it("¥1,000未満は警告", () => {
    expect(checkAmount(500).warn).toBe(true)
  })
  it("¥150,000超は警告", () => {
    expect(checkAmount(160000).warn).toBe(true)
  })
  it("正常域は警告なし", () => {
    expect(checkAmount(45000)).toEqual({ amount: 45000, warn: false })
  })
})
