import { describe, it, expect } from 'vitest'
import { conservativeSalePrice, gradeAdjust, seibiCost, seibiAdjustedPrice } from './pricing'

describe('conservativeSalePrice (p30)', () => {
  it('linear interpolation', () => {
    expect(conservativeSalePrice([50000, 60000, 70000, 80000, 90000, 100000])).toBe(65000)
  })
  it('empty → 0, single → itself', () => {
    expect(conservativeSalePrice([])).toBe(0)
    expect(conservativeSalePrice([72000])).toBe(72000)
  })
})

describe('gradeAdjust', () => {
  it('grade 6 = base, 8 up, 4 down', () => {
    expect(gradeAdjust(70000, 6)).toBe(70000)
    expect(gradeAdjust(70000, 8)).toBe(78400)
    expect(gradeAdjust(70000, 4)).toBe(61600)
  })
  it('clamps out of range', () => {
    expect(gradeAdjust(70000, 20)).toBe(gradeAdjust(70000, 10))
  })
})

describe('seibi', () => {
  it('cost = hours*1500 + parts', () => {
    expect(seibiCost(3, 6000)).toBe(10500)
  })
  it('adjusted price adds premium', () => {
    expect(seibiAdjustedPrice(73000, 20000)).toBe(93000)
  })
})
