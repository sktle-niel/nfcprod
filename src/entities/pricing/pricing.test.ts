import { describe, expect, it } from 'vitest'
import {
  checkPricing,
  isClean,
  parsePercent,
  parsePesos,
  parsePricing,
  salePrice,
  validatePricing,
  yearSaving,
  type Pricing,
  type RawOffer,
} from './pricing'

const PRICING: Pricing = {
  card: { price: 37900, discount: 0, perks: ['Free setup & guide'] },
  month: { price: 47900, discount: 0, perks: ['Free hosting'] },
  year: { price: 399900, discount: 0, perks: ['Free hosting'] },
}

const raw = (changes: Partial<Record<keyof Pricing, Partial<RawOffer>>> = {}): Record<keyof Pricing, RawOffer> => ({
  card: { price: '379', discount: '0', perks: ['Free setup & guide'], ...changes.card },
  month: { price: '479', discount: '', perks: ['Free hosting'], ...changes.month },
  year: { price: '3,999', discount: '0', perks: ['Free hosting'], ...changes.year },
})

describe('parsePesos', () => {
  it.each([
    ['379', 37900],
    ['3,999', 399900],
    ['₱ 479', 47900],
  ])('reads %s', (value, centavos) => {
    expect(parsePesos(value)).toBe(centavos)
  })

  it.each(['', '3.50', '-5', 'abc', '1e3', '1234567890'])('refuses %s', (value) => {
    expect(parsePesos(value)).toBeNull()
  })
})

describe('parsePercent', () => {
  it('reads whole percents, and empty as none', () => {
    expect(parsePercent('20')).toBe(20)
    expect(parsePercent('15 %')).toBe(15)
    expect(parsePercent('')).toBe(0)
    expect(parsePercent('2.5')).toBeNull()
    expect(parsePercent('-5')).toBeNull()
  })
})

describe('salePrice', () => {
  it('takes the discount off and rounds to the peso', () => {
    expect(salePrice({ price: 37900, discount: 0 })).toBe(37900)
    expect(salePrice({ price: 37900, discount: 20 })).toBe(30300)
    expect(salePrice({ price: 47900, discount: 15 })).toBe(40700)
  })
})

describe('validatePricing', () => {
  it('reads the form into offers, with clean perks', () => {
    const result = validatePricing(raw({ card: { discount: '20', perks: ['  Free  setup  '] } }))
    expect(result).toEqual({
      ok: true,
      pricing: { ...PRICING, card: { price: 37900, discount: 20, perks: ['Free setup'] } },
    })
  })

  it('names every field with a problem', () => {
    const result = validatePricing(raw({ card: { price: '' }, month: { discount: '2.5' }, year: { price: '4.5' } }))
    expect(result).toEqual({
      ok: false,
      errors: { card: { price: 'required' }, month: { discount: 'invalid' }, year: { price: 'invalid' } },
    })
  })

  it('checks ranges and each perk', () => {
    const result = validatePricing(raw({ card: { price: '0', discount: '95', perks: ['ok item', '', 'x'] } }))
    expect(result).toEqual({
      ok: false,
      errors: { card: { price: 'range', discount: 'range', perks: [null, 'required', 'tooShort'] } },
    })
  })

  it('refuses more than eight perks', () => {
    const result = validatePricing(raw({ month: { perks: Array.from({ length: 9 }, (_, i) => `Item ${i}`) } }))
    expect(result).toEqual({ ok: false, errors: { month: { list: 'tooMany' } } })
  })

  it('refuses a year that costs more than twelve months', () => {
    expect(validatePricing(raw({ month: { price: '300' }, year: { price: '3601' } }))).toEqual({
      ok: false,
      errors: { year: { price: 'yearTooHigh' } },
    })
    expect(validatePricing(raw({ month: { price: '300' }, year: { price: '3600' } })).ok).toBe(true)
  })
})

describe('checkPricing', () => {
  it('refuses fractions, perks that are not clean, and accepts a sane set', () => {
    expect(isClean(checkPricing(PRICING))).toBe(true)
    const bad = { ...PRICING, card: { price: 379.5, discount: 0, perks: ['two\nlines'] } }
    expect(checkPricing(bad)).toEqual({ card: { price: 'range', perks: ['invalid'] } })
  })
})

describe('parsePricing', () => {
  it('accepts a full, sane set and nothing else', () => {
    expect(parsePricing(PRICING)).toEqual(PRICING)
    expect(parsePricing({ ...PRICING, card: { ...PRICING.card, perks: [1] } })).toBeNull()
    expect(parsePricing({ ...PRICING, year: { price: '3999', discount: 0, perks: [] } })).toBeNull()
    expect(parsePricing({ card: PRICING.card })).toBeNull()
    expect(parsePricing(null)).toBeNull()
  })
})

describe('yearSaving', () => {
  it('compares a year with twelve months at the prices customers pay', () => {
    expect(yearSaving(PRICING)).toEqual({ saving: 174900, percent: 30, perMonth: 33300 })
    const monthOnSale = { ...PRICING, month: { ...PRICING.month, discount: 50 } }
    // ₱240 a month on sale is ₱2,880 a year, less than ₱3,999.
    expect(yearSaving(monthOnSale).saving).toBeLessThan(0)
  })
})
