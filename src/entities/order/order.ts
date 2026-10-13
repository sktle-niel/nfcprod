export const PLATFORMS = ['facebook', 'instagram', 'google'] as const
export type Platform = (typeof PLATFORMS)[number]

export const BUNDLE_IDS = ['one', 'two', 'three'] as const
export type BundleId = (typeof BUNDLE_IDS)[number]

/** How many cards each bundle includes. The server must derive the price from the bundle id, never from the client. */
export const BUNDLE_CARD_COUNT: Record<BundleId, number> = { one: 1, two: 2, three: 3 }

/** What the customer typed, before checking. */
export type RawOrder = {
  bundleId: string
  platforms: readonly string[]
  fullName: string
  phone: string
  province: string
  city: string
  barangay: string
  street: string
  landmark: string
  consent: boolean
}

/** A checked and cleaned order, safe to send. */
export type Order = {
  bundleId: BundleId
  platforms: Platform[]
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
  /** Integer centavos, decided by the server from the bundle id. */
  total: number
}
