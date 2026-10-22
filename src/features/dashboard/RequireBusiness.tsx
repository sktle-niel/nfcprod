import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { Block, Pulse } from '@/shared/ui/Skeleton'
import ui from '@/shared/ui/ui.module.css'
import { useDashboardData } from './dashboardData'
import styles from './RequireBusiness.module.css'

/**
 * The pages about the owner's business need one. While it loads they show a quiet skeleton; an owner who has not been
 * through the setup wizard is sent there. Behind this, `useOwnedBusiness` always has a business.
 */
export function RequireBusiness({ children }: { children: ReactNode }) {
  const { loading, business } = useDashboardData()

  if (loading) {
    return (
      <>
        <p role="status" className={ui.visuallyHidden}>
          {dashboardCopy.shell.loading}
        </p>
        <Pulse className={styles.skeleton}>
          <Block width="40%" height={36} />
          <Block height={160} />
          <Block height={160} />
        </Pulse>
      </>
    )
  }
  if (!business) return <Navigate to="/dashboard/setup" replace />
  return children
}
