import type { BundleId, OrderRecord, OrderStatus } from '@/entities/order/order'

/** True when `text` contains every word of `query`. An empty query matches everything. */
export function matchesQuery(text: string, query: string): boolean {
  const haystack = text.toLowerCase()
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  // The second check lets "0917-123-4567" find a mobile number that is stored as +639171234567.
  return terms.every((term) => haystack.includes(term) || haystack.includes(term.replace(/[-().]/g, '')))
}

/** What an admin might type to find an order: name, reference, mobile (both ways of writing it) and address. */
function searchText(order: OrderRecord): string {
  return [
    order.fullName,
    order.reference,
    order.phone,
    `0${order.phone.slice(3)}`,
    order.province,
    order.city,
    order.barangay,
    order.street,
    order.landmark,
  ].join(' ')
}

export type OrderFilter = {
  query: string
  status: OrderStatus | 'all'
  bundle: BundleId | 'all'
  /** Only orders from this moment on (ms), or null for all time. */
  from: number | null
}

export function filterOrders(orders: readonly OrderRecord[], filter: OrderFilter): OrderRecord[] {
  return orders.filter(
    (order) =>
      (filter.status === 'all' || order.status === filter.status) &&
      (filter.bundle === 'all' || order.bundleId === filter.bundle) &&
      (filter.from === null || Date.parse(order.createdAt) >= filter.from) &&
      matchesQuery(searchText(order), filter.query),
  )
}
