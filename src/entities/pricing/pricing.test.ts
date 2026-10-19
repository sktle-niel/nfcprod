import { describe, expect, it } from 'vitest'
import { checkPrices, parsePesos, parsePrices, validatePrices, yearSaving } from './pricing'

describe('parsePesos', () => {
  it.each([
    ['379', 37900],
    ['3,999', 399900],
    ['₱ 479', 47900],
    [' 12 ', 1200],
  ])('reads %s', (value, centavos) => {
    expect(parsePesos(value)).toBe(centavos)
  })

  it.each(['', '3.50', '-5', 'abc', '1e3', '1234567890'])('refuses %s', (value) => {
    expect(parsePesos(value)).toBeNull()
  })
})

describe('validatePrices', () => {
  it('turns whole pesos into centavos', () => {
    expect(validatePrices({ card: '379', month: '479', year: '3,999' })).toEqual({
      ok: true,
      prices: { card: 37900, month: 47900, year: 399900 },
    })
  })

  it('names every field with a problem', () => {
    expect(validatePrices({ card: '', month: '4.5', year: '0' })).toEqual({
      ok: false,
      errors: { card: 'required', month: 'invalid' },
    })
    expect(validatePrices({ card: '0', month: '479', year: '200000' })).toEqual({
      ok: false,
      errors: { card: 'range', year: 'range' },
    })
  })

  it('refuses a year that costs more than twelve months', () => {
    expect(validatePrices({ card: '379', month: '300', year: '3601' })).toEqual({ ok: false, errors: { year: 'yearTooHigh' } })
    expect(validatePrices({ card: '379', month: '300', year: '3600' }).ok).toBe(true)
  })
})

describe('checkPrices', () => {
  it('refuses fractions of a centavo and amounts out of range', () => {
    expect(checkPrices({ card: 379.5, month: 47900, year: 399900 })).toEqual({ card: 'range' })
    expect(checkPrices({ card: 37900, month: 47900, year: 399900 })).toEqual({})
  })
})

describe('parsePrices', () => {
  it('accepts a full, sane set and nothing else', () => {
    expect(parsePrices({ card: 37900, month: 47900, year: 399900, extra: 1 })).toEqual({ card: 37900, month: 47900, year: 399900 })
    expect(parsePrices({ card: '379', month: 47900, year: 399900 })).toBeNull()
    expect(parsePrices({ card: 37900, month: 47900 })).toBeNull()
    expect(parsePrices(null)).toBeNull()
  })
})

describe('yearSaving', () => {
  it('compares a year with twelve months', () => {
    expect(yearSaving({ month: 47900, year: 399900 })).toEqual({ saving: 174900, percent: 30, perMonth: 33300 })
    expect(yearSaving({ month: 40000, year: 480000 })).toEqual({ saving: 0, percent: 0, perMonth: 40000 })
  })
})
