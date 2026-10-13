import { useMemo } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { copy } from '@/config/copy'
import { env } from '@/config/env'
import { adminOrders, type AdminOrderRepository } from '@/data/adminOrders'
import { Logo } from '@/shared/ui/Logo'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { AdminDataContext, type AdminData } from './adminData'
import styles from './AdminLayout.module.css'
import { AdminNav } from './AdminNav'
import ui from './ui.module.css'
import { useOrders } from './useOrders'

type Props = {
  repository?: AdminOrderRepository
}

/**
 * The admin shell: sidebar (a tab bar on phones), a top strip, and the page. Loads the orders once for every page.
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
    <div className={styles.shell}>
      <meta name="robots" content="noindex" />
      <a className={styles.skip} href="#admin-main">
        {copy.admin.skip}
      </a>

      <aside className={styles.sidebar}>
        <Link className={styles.brand} to="/admin" aria-label={env.appName}>
          <Logo className={styles.logo} />
        </Link>
        <AdminNav />
      </aside>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <Link className={styles.mobileBrand} to="/admin" aria-label={env.appName}>
            <Logo className={styles.logo} />
          </Link>
          <div className={styles.actions}>
            {data.demo && <span className={styles.demo}>{copy.admin.demo}</span>}
            <ThemeToggle />
          </div>
        </header>

        <main id="admin-main" className={styles.main}>
          {state.status === 'loading' && (
            <p role="status" className={ui.visuallyHidden}>
              {copy.admin.loading}
            </p>
          )}
          {state.status === 'error' ? (
            <p role="alert" className={styles.note}>
              {copy.admin.error}
              <button type="button" className={styles.retry} onClick={retry}>
                {copy.admin.retry}
              </button>
            </p>
          ) : (
            <AdminDataContext.Provider value={data}>
              <Outlet />
            </AdminDataContext.Provider>
          )}
        </main>
      </div>
    </div>
  )
}
