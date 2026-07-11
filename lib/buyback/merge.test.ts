import { describe, it, expect } from "vitest"
import { mergeFields } from "./merge"

describe("mergeFields", () => {
  it("新しい非null値で上書き", () => {
    const r = mergeFields({ model: "カブ", mileage_km: null }, { mileage_km: 12000 })
    expect(r).toEqual({ model: "カブ", mileage_km: 12000 })
  })
  it("incoming の null は既存を消さない", () => {
    const r = mergeFields({ model: "ダックス", engine_status: "かかる" }, { model: null, docs_status: "あり" })
    expect(r.model).toBe("ダックス")
    expect(r.engine_status).toBe("かかる")
    expect(r.docs_status).toBe("あり")
  })
  it("空から累積", () => {
    let s = mergeFields({}, { model: "モンキー" })
    s = mergeFields(s, { engine_status: "かかる" })
    expect(s).toEqual({ model: "モンキー", engine_status: "かかる" })
  })
})
