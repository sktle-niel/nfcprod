import { useEffect, useState } from 'react'
import { pricing, type PricingRepository } from '@/data/pricing'
import type { Pricing } from '@/entities/pricing/pricing'

/**
 * The offers the admin set, or null until they arrive. If they cannot be loaded they stay null:
 * a dash is better than a price that may be wrong.
 */
export function usePricing(repository: PricingRepository = pricing): Pricing | null {
  const [offers, setOffers] = useState<Pricing | null>(null)

  useEffect(() => {
    let live = true
    repository.get().then(
      (loaded) => {
        if (live) setOffers(loaded)
      },
      () => {},
    )
    return () => {
      live = false
    }
  }, [repository])

  return offers
}
