import { describe, expect, it } from 'vitest'
import { makeOrder } from '@/test/orders'
import { filterOrders, matchesQuery, type OrderFilter } from './filterOrders'

const all: OrderFilter = { query: '', status: 'all', size: 'all', from: null }

const maria = makeOrder({ reference: 'NFC-7K2M9Q', fullName: 'Maria Santos', phone: '+639171234501' })
const juan = makeOrder({
  reference: 'NFC-4P8R1T',
  fullName: 'Juan Dela Cruz',
  phone: '+639171234502',
  province: 'Davao del Sur',
  city: 'Davao City',
  status: 'confirmed',
  items: [{ platform: 'facebook', quantity: 2 }],
  createdAt: '2026-10-01T04:12:00Z',
})
const orders = [maria, juan]

describe('matchesQuery', () => {
  it.each([
    ['', true],
    ['   ', true],
    ['maria', true],
    ['MARIA santos', true],
    ['maria nobody', false],
  ])('matches the query %j: %s', (query, expected) => {
    expect(matchesQuery('Maria Santos', query)).toBe(expected)
  })
})

describe('filterOrders', () => {
  it('keeps everything when nothing is asked', () => {
    expect(filterOrders(orders, all)).toEqual(orders)
  })

  it.each([
    ['maria', [maria]],
    ['davao', [juan]],
    ['nfc-4p8r', [juan]],
    ['4501', [maria]],
    ['09171234501', [maria]],
    ['0917 123 4501', [maria]],
    ['0917-123-4501', [maria]],
    ['+639171234501', [maria]],
    ['maria cebu', [maria]],
    ['maria davao', []],
    ['nobody', []],
  ] as const)('finds %j', (query, expected) => {
    expect(filterOrders(orders, { ...all, query })).toEqual(expected)
  })

  it('filters by status, size and start date together', () => {
    expect(filterOrders(orders, { ...all, status: 'confirmed' })).toEqual([juan])
    expect(filterOrders(orders, { ...all, size: 'one' })).toEqual([maria])
    expect(filterOrders(orders, { ...all, size: 'two' })).toEqual([juan])
    expect(filterOrders(orders, { ...all, from: Date.parse('2026-10-10T00:00:00Z') })).toEqual([maria])
    expect(filterOrders(orders, { ...all, status: 'new', size: 'two' })).toEqual([])
  })
})
