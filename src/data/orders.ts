import { env } from '@/config/env'
import type { Order, OrderReceipt } from '@/entities/order/order'

export type OrderFailure = 'network' | 'rateLimited' | 'rejected'

export class OrderError extends Error {
  code: OrderFailure

  constructor(code: OrderFailure) {
    super(code)
    this.code = code
  }
}

/** The seam between the form and wherever orders end up (an API later). */
export interface OrderRepository {
  submit(order: Order): Promise<OrderReceipt>
}

/** Demo mode: nothing leaves the browser. */
export const mockOrders: OrderRepository = {
  async submit() {
    await new Promise((resolve) => setTimeout(resolve, 700))
    return { reference: `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, demo: true }
  },
}

function hasReference(value: unknown): value is { reference: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'reference' in value &&
    typeof value.reference === 'string' &&
    value.reference.length > 0 &&
    value.reference.length <= 64
  )
}

export function httpOrders(endpoint: string): OrderRepository {
  return {
    async submit(order) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12_000)
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order),
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        })
        if (response.status === 429) throw new OrderError('rateLimited')
        if (!response.ok) throw new OrderError('rejected')
        const data: unknown = await response.json()
        if (!hasReference(data)) throw new OrderError('rejected')
        return { reference: data.reference, demo: false }
      } catch (error) {
        throw error instanceof OrderError ? error : new OrderError('network')
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

// Only https endpoints (or local http while developing). Anything else falls back to demo mode.
const usable = /^https:\/\//.test(env.ordersEndpoint) || /^http:\/\/localhost[:/]/.test(env.ordersEndpoint)

export const orders: OrderRepository = usable ? httpOrders(env.ordersEndpoint) : mockOrders
