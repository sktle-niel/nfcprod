import { dashboardCopy } from '@/config/dashboardCopy'
import { IconAccount, IconDesign, IconMenu, IconOverview, IconShare } from '@/shared/ui/icons'
import type { ShellNavItem } from '@/shared/ui/shell/ShellNav'

const nav = dashboardCopy.shell.nav

/** Five items. On a phone they share the row of the tab bar, which fits at 360 px; a sixth would be too tight. */
export const DASHBOARD_NAV: readonly ShellNavItem[] = [
  { to: '/dashboard', end: true, label: nav.overview, Icon: IconOverview },
  { to: '/dashboard/menu', label: nav.menu, Icon: IconMenu },
  { to: '/dashboard/design', label: nav.design, Icon: IconDesign },
  { to: '/dashboard/share', label: nav.share, Icon: IconShare },
  { to: '/dashboard/account', label: nav.account, Icon: IconAccount },
]
