import { useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LoadError } from '@/shared/ui/LoadError'
import { PageHeader } from '@/shared/ui/PageHeader'
import ui from '@/shared/ui/ui.module.css'
import { useOwnedBusiness } from '../dashboardData'
import { ChecklistPanel } from './ChecklistPanel'
import styles from './overview.module.css'
import { PlanGate } from './PlanGate'
import { FreeCardsPanel, PlanPanel } from './PlanPanels'
import { QuickActions } from './QuickActions'
import { StatusPanel } from './StatusPanel'
import { VisitorsPanel } from './VisitorsPanel'

const text = dashboardCopy.overview

/** The owner's home: is the menu on, what is left to set up, where the plan stands, and how many people look. */
export function OverviewPage() {
  const { business, menu, account } = useOwnedBusiness()
  // Retry takes the plan error away with its button, so the page title keeps the focus while the plan loads again.
  const page = useRef<HTMLDivElement>(null)

  return (
    <div ref={page}>
      <title>{text.title}</title>
      <PageHeader title={text.title} subtitle={business.name} />
      {/* Always there, so a screen reader hears when it starts to say the plan is loading (after Retry). */}
      <p role="status" className={ui.visuallyHidden}>
        {account.resource.status === 'loading' ? text.planLoading : ''}
      </p>
      <div className={styles.stack}>
        {account.resource.status === 'error' && (
          <div className={styles.loadError}>
            <LoadError message={text.planError} retryLabel={dashboardCopy.shell.retry} onRetry={account.retry} focusTitleIn={page} />
          </div>
        )}
        <PlanGate rows={3}>{({ access }) => <StatusPanel business={business} access={access} />}</PlanGate>
        <QuickActions />
        <div className={styles.columns}>
          <div className={styles.column}>
            <PlanGate rows={5}>{({ access }) => <ChecklistPanel business={business} menu={menu} access={access} />}</PlanGate>
            <VisitorsPanel />
          </div>
          <div className={styles.column}>
            <PlanGate rows={3}>{({ access }) => <PlanPanel access={access} published={business.published} />}</PlanGate>
            <PlanGate rows={2}>{({ subscription }) => <FreeCardsPanel subscription={subscription} />}</PlanGate>
          </div>
        </div>
      </div>
    </div>
  )
}
