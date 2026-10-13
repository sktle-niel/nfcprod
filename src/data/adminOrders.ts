import type { OrderRecord, OrderStatus } from '@/entities/order/order'
import { SAMPLE_AS_OF, sampleOrders } from './adminOrders.sample'

export type AdminOrderList = {
  /** Newest first. */
  records: readonly OrderRecord[]
  /** True when no backend is connected and these are made-up orders. */
  demo: boolean
  /** "Now" for the dashboard, as an ISO time. The sample data keeps a fixed day so its numbers never go stale. */
  asOf: string
}

/**
 * The admin's seam, next to OrderRepository (the form's seam).
 * Do not add a real adapter before admin sign-in exists: ARCHITECTURE sections 7.7 and 7.8.
 */
export interface AdminOrderRepository {
  list(): Promise<AdminOrderList>
  /** Returns the order as it is after the change. */
  setStatus(reference: string, status: OrderStatus): Promise<OrderRecord>
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Demo mode: made-up orders that live in memory only. Every call starts from `seed` again. */
export function createMockAdminOrders(seed: readonly OrderRecord[] = sampleOrders, asOf = SAMPLE_AS_OF): AdminOrderRepository {
  let records = [...seed]
  return {
    async list() {
      await wait(500)
      return { records: [...records], demo: true, asOf }
    },
    async setStatus(reference, status) {
      await wait(150)
      const current = records.find((order) => order.reference === reference)
      if (!current) throw new Error('Order not found')
      const updated = { ...current, status }
      records = records.map((order) => (order.reference === reference ? updated : order))
      return updated
    },
  }
}

export const adminOrders: AdminOrderRepository = createMockAdminOrders()
