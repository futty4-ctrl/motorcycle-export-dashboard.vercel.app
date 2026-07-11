import { describe, it, expect } from 'vitest'
import { OTOSHIME_BRACKETS, VENUE_SHIPPING, FEE_CONST, TARGET_PROFIT, TURN_FLOOR_RATE } from './config'

describe('config', () => {
  it('BDS brackets: 10 tiers ending open', () => {
    expect(OTOSHIME_BRACKETS.BDS).toHaveLength(10)
    expect(OTOSHIME_BRACKETS.BDS.at(-1)!.underYen).toBeNull()
  })
  it('JBA mid tier (20万未満) is 6600', () => {
    expect(OTOSHIME_BRACKETS.JBA.find((b) => b.underYen === 200000)!.fee).toBe(6600)
  })
  it('BDS堺 standard shipping 1000, bulky unknown', () => {
    expect(VENUE_SHIPPING['BDS堺'].standard).toBe(1000)
    expect(VENUE_SHIPPING['BDS堺'].bulky).toBeNull()
  })
  it('constants', () => {
    expect(FEE_CONST.YAHOO_FEE).toBe(1980)
    expect(TARGET_PROFIT).toBe(20000)
    expect(TURN_FLOOR_RATE).toBe(0.15)
  })
})
