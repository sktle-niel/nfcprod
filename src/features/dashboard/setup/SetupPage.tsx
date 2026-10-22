import { Navigate } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { Block, Pulse } from '@/shared/ui/Skeleton'
import ui from '@/shared/ui/ui.module.css'
import { FROM_SETUP } from '../arrival'
import { useDashboardData } from '../dashboardData'
import styles from './SetupPage.module.css'
import { SetupTopBar } from './SetupTopBar'
import { SetupWizard } from './SetupWizard'

const text = dashboardCopy.setup

/**
 * The first-run wizard, on its own (no sidebar). An owner who already has a business has no use for it and goes to the
 * dashboard; while the business loads, a quiet skeleton holds the place. The page re-renders into that redirect the moment
 * the business is made, before the wizard's own hand-over, so both leave the same sign (see `arrival.ts`).
 */
export function SetupPage() {
  const { loading, business } = useDashboardData()
  if (business) return <Navigate to="/dashboard" replace state={FROM_SETUP} />

  return (
    <div className={styles.page}>
      <title>{text.title}</title>
      <meta name="robots" content="noindex" />
      <SetupTopBar />
      <main className={styles.main}>
        <h1 className={styles.title}>{text.title}</h1>
        <p className={styles.intro}>{text.intro}</p>
        {loading ? (
          <>
            <p role="status" className={ui.visuallyHidden}>
              {dashboardCopy.shell.loading}
            </p>
            <Pulse className={styles.skeleton}>
              <Block width="30%" height={14} />
              <Block width="70%" height={28} />
              <Block height={46} />
            </Pulse>
          </>
        ) : (
          <SetupWizard />
        )}
      </main>
    </div>
  )
}
