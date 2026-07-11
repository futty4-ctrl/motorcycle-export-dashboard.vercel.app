import { describe, it, expect } from "vitest"
import { parseExtraction, isReadyForValuation } from "./hearing"

describe("parseExtraction", () => {
  it("素のJSONを抽出", () => {
    const r = parseExtraction(
      '{"maker":"ホンダ","model":"ダックス","model_year":"1972","mileage_km":12000,"engine_status":"かかる","docs_status":"あり","note":null}'
    )
    expect(r).toEqual({
      maker: "ホンダ",
      model: "ダックス",
      model_year: "1972",
      mileage_km: 12000,
      engine_status: "かかる",
      docs_status: "あり",
      note: null,
    })
  })
  it("```json フェンス付きでもパース", () => {
    const r = parseExtraction('```json\n{"model":"モンキー","mileage_km":"12000km"}\n```')
    expect(r?.model).toBe("モンキー")
    expect(r?.mileage_km).toBe(12000)
    expect(r?.maker).toBeNull()
  })
  it("空文字は null 扱い", () => {
    const r = parseExtraction('{"maker":"  ","model":"カブ"}')
    expect(r?.maker).toBeNull()
    expect(r?.model).toBe("カブ")
  })
  it("不正JSON・配列は null", () => {
    expect(parseExtraction("これはJSONじゃない")).toBeNull()
    expect(parseExtraction("[1,2,3]")).toBeNull()
  })
})

describe("isReadyForValuation", () => {
  it("車種＋写真1枚＋始動回答 → true", () => {
    expect(isReadyForValuation({ model: "ダックス", photoCount: 1, engineStatus: "かかる" })).toBe(true)
  })
  it("始動が「不明」でも回答ありとみなす → true", () => {
    expect(isReadyForValuation({ model: "カブ", photoCount: 3, engineStatus: "不明" })).toBe(true)
  })
  it("車種なし → false", () => {
    expect(isReadyForValuation({ model: null, photoCount: 2, engineStatus: "かかる" })).toBe(false)
  })
  it("写真0枚 → false", () => {
    expect(isReadyForValuation({ model: "モンキー", photoCount: 0, engineStatus: "かかる" })).toBe(false)
  })
  it("始動未回答 → false", () => {
    expect(isReadyForValuation({ model: "モンキー", photoCount: 2, engineStatus: null })).toBe(false)
  })
})

import { nextHearingPrompt } from "./hearing"

describe("nextHearingPrompt", () => {
  it("車種なし → 車種を聞く", () => {
    expect(nextHearingPrompt({})?.kind).toBe("model")
  })
  it("車種あり・始動なし → 始動を聞く(quick)", () => {
    const p = nextHearingPrompt({ model: "カブ" })
    expect(p?.kind).toBe("engine")
    expect(p?.quick).toBe("engine")
  })
  it("車種・始動あり・写真0 → 写真を聞く", () => {
    expect(nextHearingPrompt({ model: "カブ", engine_status: "かかる", photo_count: 0 })?.kind).toBe("photo")
  })
  it("全部揃えば null（つなぎへ）", () => {
    expect(nextHearingPrompt({ model: "カブ", engine_status: "不明", photo_count: 2 })).toBeNull()
  })
})
