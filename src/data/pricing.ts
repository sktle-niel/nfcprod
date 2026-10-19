import { checkPrices, type Prices } from '@/entities/pricing/pricing'

/** The prices could not be loaded or saved. */
export class PricingError extends Error {}

/**
 * The seam between the pages that show or edit prices and wherever they are kept.
 * A real adapter needs admin sign-in for `save`, and the server must charge from its own copy:
 * ARCHITECTURE sections 7.7 and 7.8.
 */
export interface PricingRepository {
  get(): Promise<Prices>
  /** Returns the prices as they are after the change. */
  save(prices: Prices): Promise<Prices>
}

/** The prices the platform starts with. */
export const DEFAULT_PRICES: Prices = { card: 37900, month: 47900, year: 399900 }

/** Demo mode: the prices live in this tab's memory, so a change shows on the landing page until a reload. */
export function createMockPricing(seed: Prices = DEFAULT_PRICES, { delay = 0 }: { delay?: number } = {}): PricingRepository {
  let current = { ...seed }
  const wait = () => new Promise((resolve) => setTimeout(resolve, delay))
  return {
    async get() {
      await wait()
      return { ...current }
    },
    async save(prices) {
      await wait()
      // The server repeats the admin's checks, so this does too.
      if (Object.keys(checkPrices(prices)).length > 0) throw new PricingError('invalid prices')
      current = { ...prices }
      return { ...current }
    },
  }
}

export const pricing: PricingRepository = createMockPricing()

/** True while the mock above stands in for a backend. */
export const pricingDemo = true
