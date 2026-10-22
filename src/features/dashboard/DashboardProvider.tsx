import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { Button } from '@/shared/ui/Button'
import { LoadError } from '@/shared/ui/LoadError'
import { DashboardDataContext } from './dashboardData'
import styles from './DashboardProvider.module.css'
import { useLogOut } from './useLogOut'
import { useOwnerData, type Options } from './useOwnerData'

const text = dashboardCopy.shell

/**
 * Loads the owner's business, menu and plan once for every page under /dashboard (the setup wizard and the shell with its
 * pages), and shares them through DashboardDataContext. The repositories are for tests.
 */
export function DashboardProvider(options: Options) {
  const data = useOwnerData(options)
  const { failed, retrying, loading } = data
  // The failure view stays while its retry runs, so Retry keeps the focus. When the page comes in its place, the focus
  // goes to the page title, as after any arrival (the button that held it is gone).
  const handOver = useRef(false)
  useEffect(() => {
    if (retrying) handOver.current = true
    else if (handOver.current && !failed && !loading) {
      handOver.current = false
      const title = document.querySelector<HTMLElement>('main h1')
      title?.setAttribute('tabindex', '-1')
      title?.focus()
    }
  }, [failed, retrying, loading])

  if (failed || retrying) return <LoadFailure retrying={retrying} onRetry={data.retry} />
  return (
    <DashboardDataContext.Provider value={data}>
      <Outlet />
    </DashboardDataContext.Provider>
  )
}

/** The whole dashboard could not load: say so, try again, or leave (Log out works without the business). */
function LoadFailure({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  const logOut = useLogOut()
  return (
    <main className={styles.failure}>
      <title>{text.failedTitle}</title>
      <h1 className={styles.title}>{text.failedTitle}</h1>
      {/* Always there, so a screen reader hears when it starts to say the dashboard is loading. */}
      <p role="status" className={styles.status}>
        {retrying ? text.loading : ''}
      </p>
      <LoadError message={text.loadError} retryLabel={text.retry} onRetry={onRetry} busy={retrying} />
      <div>
        <Button variant="secondary" onClick={logOut}>
          {text.signedIn.logOut}
        </Button>
      </div>
    </main>
  )
}
