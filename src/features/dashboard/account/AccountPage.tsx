import { useEffect, useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { menuState } from '@/entities/business/status'
import { useSession } from '@/shared/session/context'
import { LoadError } from '@/shared/ui/LoadError'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Block, Pulse } from '@/shared/ui/Skeleton'
import ui from '@/shared/ui/ui.module.css'
import { useDashboardData } from '../dashboardData'
import { useLogOut } from '../useLogOut'
import styles from './AccountPage.module.css'
import { FreeCardsPanel } from './FreeCardsPanel'
import { MenuSitePanel } from './MenuSitePanel'
import { PlanPicker } from './PlanPicker'
import { PlanStatus } from './PlanStatus'
import { ProfilePanel } from './ProfilePanel'

const text = dashboardCopy.account

/** The owner's own page: who they are, the plan and billing, the free cards, and Log out. It works before the setup wizard. */
export function AccountPage() {
  const { account, access, business, loading } = useDashboardData()
  const { session } = useSession()
  const logOut = useLogOut()
  const { resource } = account
  // This page does not wait for the business: while it loads, say nothing about the menu rather than 'Not set up'.
  const state = loading ? 'unknown' : menuState(business, access)
  const published = business?.published ?? false
  // Retry takes the error away with its button, so the page title keeps the focus while the plan loads again.
  const page = useRef<HTMLDivElement>(null)
  const statusTitle = useRef<HTMLHeadingElement>(null)
  const wasActive = useRef<boolean | null>(null)

  // Starting a plan removes the Start button, which held the focus: move it to the plan title, which says the plan is on.
  const active = access === null ? null : access.kind === 'active'
  useEffect(() => {
    if (active && wasActive.current === false) statusTitle.current?.focus()
    if (active !== null) wasActive.current = active
  }, [active])

  return (
    <div ref={page} className={styles.page}>
      <title>{text.title}</title>
      <PageHeader title={text.title} />
      {session && <ProfilePanel account={session.account} onLogOut={logOut} />}
      {/* Always there, so a screen reader hears when it starts to say the plan is loading (also after Retry). */}
      <p role="status" className={ui.visuallyHidden}>
        {resource.status === 'loading' ? text.loading : ''}
      </p>

      {resource.status === 'loading' && (
        <>
          <p aria-hidden="true" className={styles.note}>
            {text.loading}
          </p>
          <Pulse className={styles.loading}>
            <Block height={72} />
            <Block height={200} />
          </Pulse>
        </>
      )}
      {resource.status === 'error' && <LoadError message={text.loadError} retryLabel={text.retry} onRetry={account.retry} focusTitleIn={page} />}
      {resource.status === 'ready' && access && (
        <>
          <PlanStatus access={access} state={state} published={published} titleRef={statusTitle} />
          <div className={styles.grid}>
            <PlanPicker
              access={access}
              pricing={resource.value.pricing}
              starting={account.starting}
              failed={account.failed}
              onStart={(plan) => void account.startPlan(plan)}
            />
            <div className={styles.side}>
              <FreeCardsPanel subscription={resource.value.subscription} />
              <MenuSitePanel state={state} published={published} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
