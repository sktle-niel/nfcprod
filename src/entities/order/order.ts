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
