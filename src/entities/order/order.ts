export const PLATFORMS = ['facebook', 'instagram', 'google'] as const
export type Platform = (typeof PLATFORMS)[number]

/** Most cards of one platform in a single order. The server must enforce the same limit. */
export const MAX_QUANTITY = 20

/** One line of an order: how many cards of one platform. */
export type OrderItem = { platform: Platform; quantity: number }

/** How many cards an order holds in all. */
export function countCards(items: readonly OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/** What the customer typed, before checking. */
export type RawOrder = {
  items: readonly { platform: string; quantity: number }[]
  fullName: string
  phone: string
  province: string
  city: string
  barangay: string
  street: string
  landmark: string
  consent: boolean
}

/** A checked and cleaned order, safe to send. The server must derive the price from the items, never from the client. */
export type Order = {
  /** Each chosen platform once, with 1 to MAX_QUANTITY cards. */
  items: OrderItem[]
  fullName: string
  /** Normalized to +639XXXXXXXXX */
  phone: string
  province: string
  city: string
  barangay: string
  street: string
  landmark: string
  consent: true
}

export type OrderReceipt = {
  reference: string
  /** True when no backend is connected and nothing was actually sent. */
  demo: boolean
}

/** Where an order is in its life: waiting for a confirmation call, confirmed, delivered or dropped. */
export const ORDER_STATUSES = ['new', 'confirmed', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** An order as the admin reads it back. The server adds the reference, the time, the status and the price. */
export type OrderRecord = Omit<Order, 'consent'> & {
  status: OrderStatus
  reference: string
  /** ISO 8601 time the order was received. */
  createdAt: string
  /** Integer centavos, decided by the server from the items. */
  total: number
}
