import { describe, expect, it } from 'vitest'
import { LAHUG_PIN } from '@/test/orders'
import { formatDateTime, formatDay, formatMobile, formatPin } from './format'

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

describe('formatPin', () => {
  it('writes latitude and longitude with five decimals', () => {
    expect(formatPin(LAHUG_PIN)).toBe('10.32800, 123.90600')
  })

  it.each([
    [{ lat: 4.8, lng: 119.47 }, '4.80000, 119.47000'],
    [{ lat: 20.78, lng: 121.84 }, '20.78000, 121.84000'],
    [{ lat: 10.32801, lng: 123.90599 }, '10.32801, 123.90599'],
  ])('keeps every decimal of %j', (pin, expected) => {
    expect(formatPin(pin)).toBe(expected)
  })

  it('rounds a longer number to five decimals', () => {
    expect(formatPin({ lat: 10.3280049, lng: 123.9059951 })).toBe('10.32800, 123.90600')
  })
})
