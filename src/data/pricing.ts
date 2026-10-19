import { copy } from '@/config/copy'
import { checkPricing, isClean, type Pricing } from '@/entities/pricing/pricing'

/** The offers could not be loaded or saved. */
export class PricingError extends Error {}

/**
 * The seam between the pages that show or edit the offers and wherever they are kept.
 * A real adapter needs admin sign-in for `save`, and the server must charge from its own copy:
 * ARCHITECTURE sections 7.7 and 7.8.
 */
export interface PricingRepository {
  get(): Promise<Pricing>
  /** Returns the offers as they are after the change. */
  save(pricing: Pricing): Promise<Pricing>
}

const { card, package: plan } = copy.landing.pricing

/** What the platform starts with: no discounts, and the perks from the copy. */
export const DEFAULT_PRICING: Pricing = {
  card: { price: 37900, discount: 0, perks: [...card.perks] },
  month: { price: 47900, discount: 0, perks: [...plan.features] },
  year: { price: 399900, discount: 0, perks: [...plan.features] },
}

function copyOf(pricing: Pricing): Pricing {
  return structuredClone(pricing)
}

/** Demo mode: the offers live in this tab's memory, so a change shows on the landing page until a reload. */
export function createMockPricing(seed: Pricing = DEFAULT_PRICING, { delay = 0 }: { delay?: number } = {}): PricingRepository {
  let current = copyOf(seed)
  const wait = () => new Promise((resolve) => setTimeout(resolve, delay))
  return {
    async get() {
      await wait()
      return copyOf(current)
    },
    async save(pricing) {
      await wait()
      // The server repeats the admin's checks, so this does too.
      if (!isClean(checkPricing(pricing))) throw new PricingError('invalid offers')
      current = copyOf(pricing)
      return copyOf(current)
    },
  }
}

export const pricing: PricingRepository = createMockPricing()

/** True while the mock above stands in for a backend. */
export const pricingDemo = true
