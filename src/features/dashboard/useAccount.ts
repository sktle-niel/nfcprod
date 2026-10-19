import { useCallback, useState } from 'react'
import { billing as defaultBilling, isCheckoutUrl, type BillingRepository } from '@/data/billing'
import { pricing as defaultPricing, type PricingRepository } from '@/data/pricing'
import type { Plan, Subscription } from '@/entities/account/subscription'
import type { Pricing } from '@/entities/pricing/pricing'
import { useResource } from '@/shared/hooks/useResource'

export type Repositories = { billing?: BillingRepository; pricing?: PricingRepository }

type AccountData = { subscription: Subscription; pricing: Pricing }

/** The owner's standing and the plan prices, and a way to start a plan. */
export function useAccount({ billing = defaultBilling, pricing = defaultPricing }: Repositories = {}) {
  const load = useCallback(
    async (): Promise<AccountData> => {
      const [subscription, offers] = await Promise.all([billing.current(), pricing.get()])
      return { subscription, pricing: offers }
    },
    [billing, pricing],
  )
  const { resource, retry, replace } = useResource(load)
  const [starting, setStarting] = useState<Plan | null>(null)
  const [failed, setFailed] = useState(false)

  async function startPlan(plan: Plan) {
    if (resource.status !== 'ready' || starting) return
    setStarting(plan)
    setFailed(false)
    try {
      const checkout = await billing.startCheckout(plan)
      if (checkout.kind === 'done') {
        replace({ ...resource.value, subscription: checkout.subscription })
        setStarting(null)
        return
      }
      // Only the payment provider's own page, never a link the response made up.
      if (!isCheckoutUrl(checkout.url)) throw new Error('unexpected checkout address')
      window.location.assign(checkout.url)
    } catch {
      setFailed(true)
      setStarting(null)
    }
  }

  return { resource, retry, startPlan, starting, failed }
}
