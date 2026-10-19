import { useCallback } from 'react'
import { pricing, type PricingRepository } from '@/data/pricing'
import type { Pricing } from '@/entities/pricing/pricing'
import { useResource } from '@/shared/hooks/useResource'

/**
 * The offers the admin set, or null until they arrive. If they cannot be loaded they stay null:
 * a dash is better than a price that may be wrong.
 */
export function usePricing(repository: PricingRepository = pricing): Pricing | null {
  const load = useCallback(() => repository.get(), [repository])
  const { resource } = useResource(load)
  return resource.status === 'ready' ? resource.value : null
}
