import { describe, expect, it } from 'vitest'
import { makeOrder } from '@/test/orders'
import {
  before,
  bucketSize,
  buckets,
  change,
  counted,
  DAY,
  dayStart,
  lastDays,
  topProvinces,
  totals,
  within,
} from './stats'

// 13 Oct 2026, 20:00 in the Philippines.
const AS_OF = Date.parse('2026-10-13T12:00:00Z')
const iso = (ms: number) => new Date(ms).toISOString()

describe('dayStart', () => {
  it('starts the Philippine day at 16:00 UTC the evening before', () => {
    expect(iso(dayStart(AS_OF))).toBe('2026-10-12T16:00:00.000Z')
    expect(iso(dayStart(Date.parse('2026-10-12T16:00:00Z')))).toBe('2026-10-12T16:00:00.000Z')
    expect(iso(dayStart(Date.parse('2026-10-12T15:59:59Z')))).toBe('2026-10-11T16:00:00.000Z')
  })
})

describe('lastDays and before', () => {
  it('cover whole days ending with the day of asOf', () => {
    const span = lastDays(AS_OF, 7)
    expect(iso(span.from)).toBe('2026-10-06T16:00:00.000Z')
    expect(iso(span.to)).toBe('2026-10-13T16:00:00.000Z')
    expect(before(span)).toEqual({ from: span.from - 7 * DAY, to: span.from })
  })
})

describe('within', () => {
  it('keeps the start of the span and drops the end', () => {
    const span = lastDays(AS_OF, 1)
    const atStart = makeOrder({ createdAt: iso(span.from) })
    const atEnd = makeOrder({ createdAt: iso(span.to) })
    expect(within([atStart, atEnd], span)).toEqual([atStart])
  })
})

describe('counted', () => {
  it('drops cancelled orders', () => {
    const kept = makeOrder({ status: 'delivered' })
    expect(counted([kept, makeOrder({ status: 'cancelled' })])).toEqual([kept])
  })
})

describe('totals', () => {
  it('adds up revenue, average and cards, and ignores cancelled orders', () => {
    const result = totals([
      makeOrder({ total: 58000, items: [{ platform: 'google', quantity: 1 }] }),
      makeOrder({
        total: 249500,
        items: [
          { platform: 'facebook', quantity: 2 },
          { platform: 'google', quantity: 3 },
        ],
      }),
      makeOrder({
        total: 78000,
        status: 'cancelled',
        items: [
          { platform: 'facebook', quantity: 1 },
          { platform: 'instagram', quantity: 1 },
        ],
      }),
    ])
    expect(result).toEqual({
      orders: 2,
      revenue: 307500,
      average: 153750,
      cards: { facebook: 2, instagram: 0, google: 4 },
      sizes: { one: 1, two: 0, more: 1 },
    })
  })

  it('rounds the average to whole centavos and copes with no orders', () => {
    expect(totals([makeOrder({ total: 100 }), makeOrder({ total: 101 })]).average).toBe(101)
    expect(totals([])).toEqual({
      orders: 0,
      revenue: 0,
      average: 0,
      cards: { facebook: 0, instagram: 0, google: 0 },
      sizes: { one: 0, two: 0, more: 0 },
    })
  })
})

describe('change', () => {
  it.each([
    [150, 100, 50],
    [50, 100, -50],
    [100, 100, 0],
  ])('puts %d against a previous %d at %d percent', (current, previous, expected) => {
    expect(change(current, previous)).toBeCloseTo(expected)
  })

  it('has nothing to compare with when the previous value is zero', () => {
    expect(change(5, 0)).toBeNull()
  })
})

describe('bucketSize', () => {
  it.each([
    [7, 1],
    [30, 1],
    [90, 7],
  ])('uses %d-day spans of %d day(s)', (days, size) => {
    expect(bucketSize(days)).toBe(size)
  })
})

describe('buckets', () => {
  it('makes one bucket per day and puts every order in its day', () => {
    const span = lastDays(AS_OF, 7)
    const result = buckets(
      [
        makeOrder({ createdAt: '2026-10-13T04:12:00Z', total: 100 }),
        makeOrder({ createdAt: '2026-10-13T09:00:00Z', total: 200 }),
        makeOrder({ createdAt: '2026-10-07T02:00:00Z', total: 50 }),
        makeOrder({ createdAt: '2026-10-12T02:00:00Z', total: 999, status: 'cancelled' }),
      ],
      span,
      1,
    )
    expect(result).toHaveLength(7)
    expect(result.at(-1)).toMatchObject({ orders: 2, revenue: 300 })
    expect(result.at(0)).toMatchObject({ orders: 1, revenue: 50 })
    expect(result.reduce((sum, bucket) => sum + bucket.orders, 0)).toBe(3)
  })

  it('makes weekly buckets and lets the oldest one be shorter', () => {
    const span = lastDays(AS_OF, 90)
    const result = buckets([], span, 7)
    expect(result).toHaveLength(13)
    expect(result.at(0)).toMatchObject({ from: span.from })
    expect(result.at(0)!.to - result.at(0)!.from).toBe(6 * DAY)
    expect(result.at(-1)).toMatchObject({ to: span.to })
  })
})

describe('topProvinces', () => {
  it('lists the busiest provinces first, ties by name, and honours the limit', () => {
    const orders = [
      makeOrder({ province: 'Cebu' }),
      makeOrder({ province: 'Cebu' }),
      makeOrder({ province: 'Bohol' }),
      makeOrder({ province: 'Aklan' }),
      makeOrder({ province: 'Aklan', status: 'cancelled' }),
    ]
    expect(topProvinces(orders)).toEqual([
      { label: 'Cebu', value: 2 },
      { label: 'Aklan', value: 1 },
      { label: 'Bohol', value: 1 },
    ])
    expect(topProvinces(orders, 1)).toEqual([{ label: 'Cebu', value: 2 }])
  })
})
