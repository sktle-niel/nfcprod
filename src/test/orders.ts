import type { OrderRecord } from '@/entities/order/order'

/** 13 Oct 2026, 20:00 in the Philippines. */
export const AS_OF = Date.parse('2026-10-13T12:00:00Z')

/** A valid order record for tests. Override only what the test cares about. */
export function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    reference: 'NFC-AAAAAA',
    createdAt: '2026-10-13T04:12:00Z',
    status: 'new',
    bundleId: 'one',
    platforms: ['google'],
    total: 58000,
    fullName: 'Test Person',
    phone: '+639170000000',
    province: 'Cebu',
    city: 'Cebu City',
    barangay: 'Lahug',
    street: '1 Test Street',
    landmark: 'Near the test landmark',
    ...overrides,
  }
}

/**
 * `count` delivered orders from different people, newest first: NFC-000000 is the newest.
 * The people are called "Person 0", "Person 1" and so on, and every one has their own mobile number.
 */
export function manyOrders(count: number): OrderRecord[] {
  const newest = Date.parse('2026-10-12T05:00:00Z')
  return Array.from({ length: count }, (_, index) =>
    makeOrder({
      reference: `NFC-${String(index).padStart(6, '0')}`,
      fullName: `Person ${index}`,
      phone: `+63917000${String(index).padStart(4, '0')}`,
      createdAt: new Date(newest - index * 3_600_000).toISOString(),
      status: 'delivered',
    }),
  )
}
