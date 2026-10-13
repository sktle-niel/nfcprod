import { useMemo, useState, type ReactNode } from 'react'
import { AdminDataContext, type AdminData } from '@/features/admin/adminData'
import type { OrderRecord, OrderStatus } from '@/entities/order/order'
import { AS_OF } from './orders'

type Props = {
  initial: readonly OrderRecord[]
  children: ReactNode
  onStatus?: (reference: string, status: OrderStatus) => void
  fail?: boolean
  /** Act as AdminLayout does before the orders arrive: loading, and no records. */
  loading?: boolean
}

/** Gives a page the data AdminLayout would give it, and applies status changes the way the layout does. */
export function AdminHarness({ initial, children, onStatus, fail = false, loading = false }: Props) {
  const [records, setRecords] = useState(initial)
  const data = useMemo<AdminData>(
    () => ({
      loading,
      records: loading ? [] : records,
      demo: true,
      asOf: loading ? 0 : AS_OF,
      setStatus: async (reference, status) => {
        onStatus?.(reference, status)
        if (fail) throw new Error('offline')
        setRecords((current) => current.map((order) => (order.reference === reference ? { ...order, status } : order)))
      },
    }),
    [records, onStatus, fail, loading],
  )
  return <AdminDataContext.Provider value={data}>{children}</AdminDataContext.Provider>
}
