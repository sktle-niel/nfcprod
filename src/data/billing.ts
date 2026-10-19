import { periodEnd, startTrial, type Plan, type Subscription } from '@/entities/account/subscription'
import { auth, type AuthRepository } from './auth'

/** The standing could not be loaded, or the checkout could not start. */
export class BillingError extends Error {}

/** What starting a plan led to: a hosted checkout page to send the owner to, or (demo) a plan already on. */
export type Checkout = { kind: 'redirect'; url: string } | { kind: 'done'; subscription: Subscription }

/**
 * The seam between the account page and billing. The server knows the owner from the session, so nothing
 * here names an account. A real adapter asks the server for a hosted checkout (PayMongo) and sends the
 * owner there; only the provider's signed webhook turns a plan on, never the browser. ARCHITECTURE 7.9.
 */
export interface BillingRepository {
  current(): Promise<Subscription>
  startCheckout(plan: Plan): Promise<Checkout>
}

// Hosted checkout pages the browser may be sent to. Anything else is refused, so a bad response
// can never become an open redirect.
const CHECKOUT_HOSTS = new Set(['checkout.paymongo.com'])

export function isCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && CHECKOUT_HOSTS.has(url.hostname) && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

type Options = { delay?: number; now?: () => number }

/**
 * Demo mode: each owner's standing lives in this tab's memory. The trial starts the first time the
 * account page asks (the server would start it at sign-up), and "checkout" turns the plan on at once.
 */
export function createMockBilling(accounts: AuthRepository = auth, { delay = 300, now = Date.now }: Options = {}): BillingRepository {
  const byAccount = new Map<string, Subscription>()
  const wait = () => new Promise((resolve) => setTimeout(resolve, delay))

  async function mine(): Promise<[string, Subscription]> {
    const session = await accounts.current()
    if (!session) throw new BillingError('signed out')
    const id = session.account.id
    const known = byAccount.get(id) ?? startTrial(now())
    byAccount.set(id, known)
    return [id, known]
  }

  return {
    async current() {
      await wait()
      return structuredClone((await mine())[1])
    },
    async startCheckout(plan) {
      await wait()
      const [id, current] = await mine()
      const updated: Subscription = { ...current, plan, paidUntil: new Date(periodEnd(plan, now())).toISOString() }
      byAccount.set(id, updated)
      return { kind: 'done', subscription: structuredClone(updated) }
    },
  }
}

export const billing: BillingRepository = createMockBilling()

/** True while the mock above stands in for a payment provider. */
export const billingDemo = true
