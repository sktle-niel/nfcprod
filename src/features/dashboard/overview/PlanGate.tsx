import type { ReactNode } from 'react'
import type { Access, Subscription } from '@/entities/account/subscription'
import { useDashboardData } from '../dashboardData'
import { PanelSkeleton } from './PanelSkeleton'

type Ready = { access: Access; subscription: Subscription }

/**
 * Shows its children once the plan has loaded, a skeleton panel of `rows` lines while it loads, and nothing when it
 * failed (the page says so once, with Retry).
 */
export function PlanGate({ rows, children }: { rows: number; children: (ready: Ready) => ReactNode }) {
  const { account, access } = useDashboardData()
  if (account.resource.status === 'error') return null
  if (account.resource.status === 'loading' || !access) return <PanelSkeleton rows={rows} />
  return children({ access, subscription: account.resource.value.subscription })
}
