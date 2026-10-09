import { describe, expect, it } from 'vitest'
import { formatPeso } from './money'

describe('formatPeso', () => {
  it('formats whole pesos without decimals', () => {
    expect(formatPeso(179900)).toBe('₱1,799')
    expect(formatPeso(14000)).toBe('₱140')
  })

  it('keeps centavos when present', () => {
    expect(formatPeso(14050)).toBe('₱140.50')
  })

  it('rejects non-integer input', () => {
    expect(() => formatPeso(10.5)).toThrow(RangeError)
  })
})
