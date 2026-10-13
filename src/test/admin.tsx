import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { OrderRecord, OrderStatus } from '@/entities/order/order'
import { AdminHarness } from './AdminHarness'

type Options = {
  records: readonly OrderRecord[]
  /** The route pattern the page is mounted on, for example "/admin/orders/:reference?". */
  route?: string
  onStatus?: (reference: string, status: OrderStatus) => void
  fail?: boolean
  loading?: boolean
}

/** Renders one admin page at `path` with the given orders. */
export function renderAdminPage(page: ReactElement, path: string, { records, route = '*', onStatus, fail, loading }: Options) {
  const props = {
    initial: records,
    ...(onStatus ? { onStatus } : {}),
    ...(fail ? { fail } : {}),
    ...(loading ? { loading } : {}),
  }
  return render(
    <AdminHarness {...props}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={page} />
        </Routes>
      </MemoryRouter>
    </AdminHarness>,
  )
}
