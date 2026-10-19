import { useEffect, useState } from 'react'
import { pricing, type PricingRepository } from '@/data/pricing'
import type { Prices } from '@/entities/pricing/pricing'

/**
 * The prices the admin set, or null until they arrive. If they cannot be loaded they stay null:
 * a dash is better than a price that may be wrong.
 */
export function usePrices(repository: PricingRepository = pricing): Prices | null {
  const [prices, setPrices] = useState<Prices | null>(null)

  useEffect(() => {
    let live = true
    repository.get().then(
      (loaded) => {
        if (live) setPrices(loaded)
      },
      () => {},
    )
    return () => {
      live = false
    }
  }, [repository])

  return prices
}
