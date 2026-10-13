import { describe, expect, it } from 'vitest'
import { formatDateTime, formatDay, formatMobile, formatPercent, initials } from './format'

describe('formatMobile', () => {
  it('writes a +63 number the way people dial it', () => {
    expect(formatMobile('+639171234567')).toBe('0917 123 4567')
  })

  it.each(['09171234567', '+63217123456', ''])('leaves %j as it is', (value) => {
    expect(formatMobile(value)).toBe(value)
  })
})

describe('formatDateTime', () => {
  it('shows the date and the time in Philippine time', () => {
    expect(formatDateTime('2026-10-13T04:12:00Z')).toMatch(/Oct 13, 2026, 12:12\s?pm/i)
  })

  it('shows a value that is not a date as it came', () => {
    expect(formatDateTime('not a date')).toBe('not a date')
  })
})

describe('formatDay', () => {
  it('shows the Philippine day', () => {
    expect(formatDay('2026-10-12T17:00:00Z')).toBe('Oct 13')
    expect(formatDay(Date.parse('2026-10-12T15:00:00Z'))).toBe('Oct 12')
  })

  it('shows a value that is not a date as it came', () => {
    expect(formatDay('soon')).toBe('soon')
  })
})

describe('formatPercent', () => {
  it.each([
    [12.5, '12.5%'],
    [12, '12%'],
    [-3.04, '3%'],
    [0, '0%'],
  ])('writes %d as %s', (value, expected) => {
    expect(formatPercent(value)).toBe(expected)
  })
})

describe('initials', () => {
  it.each([
    ['Maria Angelica Santos', 'MS'],
    ['juan dela cruz', 'JC'],
    ['Cher', 'C'],
    ['  ', ''],
  ])('turns %j into %j', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})
