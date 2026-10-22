import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { copy } from '@/config/copy'
import { env } from '@/config/env'
import { adminOrders, type AdminOrderRepository } from '@/data/adminOrders'
import { DemoTag } from '@/shared/ui/DemoTag'
import { IconCustomers, IconOrders, IconOverview, IconPricing } from '@/shared/ui/icons'
import { LoadError } from '@/shared/ui/LoadError'
import { AppShell } from '@/shared/ui/shell/AppShell'
import ui from '@/shared/ui/ui.module.css'
import { AdminDataContext, type AdminData } from './adminData'
import { useOrders } from './useOrders'

type Props = {
  repository?: AdminOrderRepository
}

const items = [
  { to: '/admin', end: true, label: copy.admin.nav.overview, Icon: IconOverview },
  { to: '/admin/orders', end: false, label: copy.admin.nav.orders, Icon: IconOrders },
  { to: '/admin/customers', end: false, label: copy.admin.nav.customers, Icon: IconCustomers },
  { to: '/admin/pricing', end: false, label: copy.admin.nav.pricing, Icon: IconPricing },
]

/**
 * The admin shell around the page. Loads the orders once for every page.
 * The page is there from the first moment and shows skeletons until the orders arrive.
 */
export function AdminLayout({ repository = adminOrders }: Props) {
  const { state, retry, setStatus } = useOrders(repository)

  const data = useMemo<AdminData>(
    () =>
      state.status === 'ready'
        ? { loading: false, records: state.records, demo: state.demo, asOf: Date.parse(state.asOf), setStatus }
        : { loading: true, records: [], demo: false, asOf: 0, setStatus },
    [state, setStatus],
  )

  return (
    <AppShell
      label={copy.admin.menu}
      home="/admin"
      brandLabel={env.appName}
      items={items}
      skipLabel={copy.admin.skip}
      mainId="admin-main"
      topbarExtra={data.demo && <DemoTag>{copy.admin.demo}</DemoTag>}
    >
      {state.status === 'loading' && (
        <p role="status" className={ui.visuallyHidden}>
          {copy.admin.loading}
        </p>
      )}
      {state.status === 'error' ? (
        <LoadError message={copy.admin.error} retryLabel={copy.admin.retry} onRetry={retry} />
      ) : (
        <AdminDataContext.Provider value={data}>
          <Outlet />
        </AdminDataContext.Provider>
      )}
    </AppShell>
  )
}
