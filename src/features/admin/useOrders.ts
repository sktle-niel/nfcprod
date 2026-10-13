import { useCallback, useEffect, useState } from 'react'
import type { AdminOrderList, AdminOrderRepository } from '@/data/adminOrders'
import type { OrderStatus } from '@/entities/order/order'

export type OrdersState = { status: 'loading' } | { status: 'error' } | ({ status: 'ready' } & AdminOrderList)

/** Loads the orders once (and again on Retry) and changes the status of one order. */
export function useOrders(repository: AdminOrderRepository) {
  const [state, setState] = useState<OrdersState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    repository.list().then(
      (list) => {
        if (active) setState({ status: 'ready', ...list })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [repository, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((count) => count + 1)
  }, [])

  const setStatus = useCallback(
    async (reference: string, status: OrderStatus) => {
      const updated = await repository.setStatus(reference, status)
      setState((current) =>
        current.status === 'ready'
          ? { ...current, records: current.records.map((order) => (order.reference === updated.reference ? updated : order)) }
          : current,
      )
    },
    [repository],
  )

  return { state, retry, setStatus }
}
