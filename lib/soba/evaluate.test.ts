import { describe, it, expect } from 'vitest'
import { calcMaxBid, calcMaxBidTurn, solveMaxHammer, evaluateBike } from './evaluate'

// アドレスV125S 相当：想定売値¥73,000・BDS堺・月20台・広告ON・整備0
const base = {
  auction: 'BDS' as const,
  venue: 'BDS堺',
  vehicleClass: 'standard' as const,
  salePrice: 73000,
  monthlyUnits: 20,
  includeAd: true,
}

describe('solveMaxHammer', () => {
  it('帯境界を安全側(下側落札料帯)で解く', () => {
    expect(solveMaxHammer('BDS', 54543)).toBe(49999) // ¥50,000境界 → 4200帯側
    expect(solveMaxHammer('BDS', 44700)).toBe(40500)
  })
})

describe('calcMaxBid / calcMaxBidTurn', () => {
  it('目標¥20k → 上限落札 ¥40,500', () => {
    expect(calcMaxBid(base)).toBe(40500)
  })
  it('回転フロア(仕入×15%) → 上限落札 ¥49,999', () => {
    expect(calcMaxBidTurn(base)).toBe(49999)
  })
})

describe('evaluateBike (3ゾーン)', () => {
  it('安い落札=🟢・想定利益¥20,550', () => {
    const r = evaluateBike({ ...base, currentHammer: 40000 })
    expect(r.zone).toBe('green')
    expect(r.expectedProfit).toBe(20550)
  })
  it('中間落札=🟡', () => {
    expect(evaluateBike({ ...base, currentHammer: 45000 }).zone).toBe('yellow')
  })
  it('高い落札=🔴・赤字¥-2,880', () => {
    const r = evaluateBike({ ...base, currentHammer: 60000 })
    expect(r.zone).toBe('red')
    expect(r.expectedProfit).toBe(-2880)
  })
})

import { assessBike } from './evaluate'

describe('assessBike (統合: 分布→p30→評価点→整備→判定)', () => {
  const dist = [58000, 62000, 68000, 73000, 80000, 92000]
  const b = {
    auction: 'BDS' as const,
    venue: 'BDS堺',
    vehicleClass: 'standard' as const,
    monthlyUnits: 20,
    currentHammer: 40000,
    salesDistribution: dist,
  }
  it('弱気売値(p30=65,000)を使う・整備なし', () => {
    const r = assessBike(b)
    expect(r.salePriceUsed).toBe(65000)
    expect(r.seibiCostUsed).toBe(0)
    expect(['green', 'yellow', 'red']).toContain(r.zone)
  })
  it('整備すると売値+プレミアム・整備コスト計上', () => {
    const r = assessBike({ ...b, seibi: { hours: 3, parts: 6000, premium: 20000 } })
    expect(r.seibiCostUsed).toBe(10500)
    expect(r.salePriceUsed).toBe(85000)
  })
  it('評価点↑で売値↑', () => {
    expect(assessBike({ ...b, grade: 8 }).salePriceUsed).toBeGreaterThan(
      assessBike({ ...b, grade: 4 }).salePriceUsed
    )
  })
})
