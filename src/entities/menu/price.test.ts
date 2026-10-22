import { describe, expect, it } from 'vitest'
import { LIMITS } from './menu'
import { parsePrice, priceInput, readPrice } from './price'

describe('parsePrice', () => {
  it.each([
    ['120', 12000],
    ['120.5', 12050],
    ['120.50', 12050],
    ['120.', 12000],
    ['.5', 50],
    ['0', 0],
    ['0.01', 1],
    ['00012', 1200],
    ['1,200', 120000],
    ['1,200.00', 120000],
    ['12,345.67', 1234567],
    ['₱ 45', 4500],
    ['₱45', 4500],
    ['  99.9  ', 9990],
    [' 150 ', 15000],
    ['100000', LIMITS.priceMax],
    ['100,000.00', LIMITS.priceMax],
  ])('reads %j as %i centavos', (text, centavos) => {
    expect(parsePrice(text)).toBe(centavos)
  })

  it('reads the digits as text, so no float rounding creeps in', () => {
    expect(parsePrice('1.15')).toBe(115)
    expect(parsePrice('19.99')).toBe(1999)
    expect(parsePrice('0.29')).toBe(29)
    expect(parsePrice('4.35')).toBe(435)
    expect(parsePrice('1,234.56')).toBe(123456)
  })

  it.each([
    '',
    '   ',
    '.',
    '₱',
    '₱₱45',
    '-5',
    '+5',
    '1.234',
    '1..2',
    '1.2.3',
    '12,50',
    '1,20',
    '1,2345',
    ',120',
    '1 200',
    'abc',
    '12a',
    '1e3',
    '0x10',
    'Infinity',
    'NaN',
    'PHP 45',
    '45 ₱',
    '１２０',
    '١٢٠',
    '100000.01',
    '100,001',
    '9'.repeat(30),
    `${' '.repeat(10_000)}120${'0'.repeat(100_000)}`,
  ])('refuses %j', (text) => {
    expect(parsePrice(text)).toBeNull()
  })

  it('refuses what is not text', () => {
    for (const value of [null, undefined, 120, {}, ['120']]) expect(parsePrice(value as unknown as string)).toBeNull()
  })
})

describe('readPrice', () => {
  it('reads what parsePrice reads, the same way', () => {
    for (const text of ['120', '1,200.00', '₱ 45', '.5', '100000', '100,000.00']) expect(readPrice(text)).toBe(parsePrice(text))
  })

  it.each(['100000.01', '100,001', '99999999999999999999', '100001'])('keeps %j as one centavo over the limit, not as no price', (text) => {
    expect(parsePrice(text)).toBeNull()
    expect(readPrice(text)).toBe(LIMITS.priceMax + 1)
  })

  it.each(['', '-5', '12,50', '1.234', 'abc', '₱₱45', '9'.repeat(30)])('still refuses %j, which is no price', (text) => {
    expect(readPrice(text)).toBeNull()
  })

  it('refuses what is not text', () => {
    for (const value of [null, undefined, 120, {}]) expect(readPrice(value as unknown as string)).toBeNull()
  })
})

describe('priceInput', () => {
  it.each([
    [12000, '120'],
    [12050, '120.50'],
    [12005, '120.05'],
    [0, '0'],
    [1, '0.01'],
    [99, '0.99'],
    [LIMITS.priceMax, '100000'],
  ])('shows %i centavos as %j', (centavos, text) => {
    expect(priceInput(centavos)).toBe(text)
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60])('leaves the box empty for %s', (centavos) => {
    expect(priceInput(centavos)).toBe('')
  })

  it('gives back every price it is shown', () => {
    for (let centavos = 0; centavos <= 25_000; centavos += 7) expect(parsePrice(priceInput(centavos))).toBe(centavos)
    for (const centavos of [LIMITS.priceMax, LIMITS.priceMax - 1, 9_999_999, 1_000_001]) {
      expect(parsePrice(priceInput(centavos))).toBe(centavos)
    }
  })
})
