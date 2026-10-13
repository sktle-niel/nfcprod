import { createContext, useContext } from 'react'
import type { OrderRecord, OrderStatus } from '@/entities/order/order'

/** What every admin page reads. AdminLayout loads it once and hands it down. */
export type AdminData = {
  /** True until the orders have arrived. Pages show skeletons meanwhile, and `records` is empty. */
  loading: boolean
  records: readonly OrderRecord[]
  demo: boolean
  /** "Now" for the dashboard, in ms. */
  asOf: number
  setStatus: (reference: string, status: OrderStatus) => Promise<void>
}

export const AdminDataContext = createContext<AdminData | null>(null)

export function useAdminData(): AdminData {
  const data = useContext(AdminDataContext)
  if (!data) throw new Error('useAdminData must be used inside AdminLayout')
  return data
}
