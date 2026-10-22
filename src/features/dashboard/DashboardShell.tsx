import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { env } from '@/config/env'
import { DemoTag } from '@/shared/ui/DemoTag'
import { AppShell } from '@/shared/ui/shell/AppShell'
import { AccountChip } from './AccountChip'
import { cameFromSetup } from './arrival'
import { useDashboardData } from './dashboardData'
import { DASHBOARD_NAV } from './nav'

const text = dashboardCopy.shell
const MAIN_ID = 'dashboard-main'

/** The owner's frame: the sidebar (a tab bar on phones), the top strip, and the page. */
export function DashboardShell() {
  const { demo } = useDashboardData()
  const { state } = useLocation()

  // The wizard's button is gone, so the focus goes to the title of the page the owner lands on.
  useEffect(() => {
    if (!cameFromSetup(state)) return
    const title = document.querySelector<HTMLElement>(`#${MAIN_ID} h1`)
    title?.setAttribute('tabindex', '-1')
    title?.focus()
  }, [state])

  return (
    <AppShell
      label={text.menu}
      home="/dashboard"
      brandLabel={env.appName}
      items={DASHBOARD_NAV}
      skipLabel={text.skip}
      mainId={MAIN_ID}
      topbarExtra={demo && <DemoTag>{text.demo}</DemoTag>}
      sidebarFooter={<AccountChip />}
    >
      <Outlet />
    </AppShell>
  )
}
