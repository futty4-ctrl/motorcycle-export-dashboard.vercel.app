import { describe, it, expect } from 'vitest'
import { getOtoshimeryo, calcCosts } from './fees'

describe('getOtoshimeryo', () => {
  it('BDS brackets (検算: 7/3計算書一致)', () => {
    expect(getOtoshimeryo('BDS', 60000)).toBe(5500)
    expect(getOtoshimeryo('BDS', 84000)).toBe(5500)
    expect(getOtoshimeryo('BDS', 45000)).toBe(4200)
    expect(getOtoshimeryo('BDS', 150000)).toBe(6900)
    expect(getOtoshimeryo('BDS', 250000)).toBe(7400)
    // ちょうど¥50,000 は「5万未満」でない → 「10万未満」帯
    expect(getOtoshimeryo('BDS', 50000)).toBe(5500)
  })
  it('JBA brackets', () => {
    expect(getOtoshimeryo('JBA', 60000)).toBe(6600)
    expect(getOtoshimeryo('JBA', 40000)).toBe(4400)
  })
})

describe('calcCosts', () => {
  it('BDS堺 standard 例（落札¥55,000・月20台・広告ON・整備0）', () => {
    const r = calcCosts({
      auction: 'BDS',
      venue: 'BDS堺',
      vehicleClass: 'standard',
      hammerYen: 55000,
      monthlyUnits: 20,
      includeAd: true,
    })
    // 落札料5500, taxed=(55000+5500)*1.1=66550, 送料1000, 名義3000/20=150
    expect(r.otoshimeryo).toBe(5500)
    expect(r.shiireTaxIncl).toBe(66550 + 1000 + 150)
    expect(r.sellSideFees).toBe(1980 + 700)
    expect(r.shippingUnknown).toBe(false)
    expect(r.total).toBe(67700 + 2680)
  })
  it('bulky車は送料未設定 → shippingUnknown', () => {
    const r = calcCosts({
      auction: 'JBA',
      venue: 'JBA神戸',
      vehicleClass: 'bulky',
      hammerYen: 50000,
    })
    expect(r.shippingUnknown).toBe(true)
  })
})
