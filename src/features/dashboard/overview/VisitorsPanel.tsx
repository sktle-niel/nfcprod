import { useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Insights } from '@/data/ownerRepository'
import { useResource } from '@/shared/hooks/useResource'
import { BarList, BarListSkeleton } from '@/shared/ui/BarList'
import { DemoTag } from '@/shared/ui/DemoTag'
import { LoadError } from '@/shared/ui/LoadError'
import { Panel } from '@/shared/ui/Panel'
import { Sparkline } from '@/shared/ui/Sparkline'
import { StatTile } from '@/shared/ui/StatTile'
import ui from '@/shared/ui/ui.module.css'
import { formatDay } from '@/shared/lib/date'
import { useDashboardData } from '../dashboardData'
import styles from './overview.module.css'

const text = dashboardCopy.overview.visitors

// Room the plot and the list take, so the skeleton of a tile is as tall as the tile.
const PLOT_HEIGHT = 84

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/** How the menu is doing with visitors. Without products there is nothing to look at, so it says what to do first. */
export function VisitorsPanel() {
  const { menu } = useDashboardData()
  if (menu.products.length > 0) return <VisitorsBody />
  return (
    <Panel title={text.title}>
      <p className={styles.body}>{text.empty}</p>
    </Panel>
  )
}

function VisitorsBody() {
  const { actions } = useDashboardData()
  const { resource, retry } = useResource(actions.loadInsights)
  const sample = resource.status === 'ready' && resource.value.demo
  // Retry takes the error away with its button: the panel title (not the page title, which would scroll away) keeps the focus.
  const panel = useRef<HTMLElement>(null)

  return (
    <Panel ref={panel} title={text.title} action={sample ? <DemoTag>{text.demo}</DemoTag> : undefined}>
      {/* Always there, so a screen reader hears when it starts to say the numbers are loading (also after Retry). */}
      <p role="status" className={ui.visuallyHidden}>
        {resource.status === 'loading' ? text.loading : ''}
      </p>
      {resource.status === 'error' ? (
        <LoadError message={text.error} retryLabel={dashboardCopy.shell.retry} onRetry={retry} focusTitleIn={panel} />
      ) : (
        <>
          <p className={styles.range}>{text.range}</p>
          {resource.status === 'loading' ? <VisitorsSkeleton /> : <VisitorsNumbers insights={resource.value} />}
        </>
      )}
    </Panel>
  )
}

function VisitorsSkeleton() {
  return (
    <>
      <div className={styles.tiles}>
        <StatTile label={text.views} value="" loading bodyHeight={PLOT_HEIGHT} />
        <StatTile label={text.taps} value="" loading bodyHeight={PLOT_HEIGHT} />
      </div>
      <h3 className={styles.top}>{text.top}</h3>
      <BarListSkeleton rows={4} />
    </>
  )
}

function VisitorsNumbers({ insights }: { insights: Insights }) {
  const points = insights.days.map((day) => ({ label: formatDay(Date.parse(day.date)), value: day.views }))
  return (
    <>
      <div className={styles.tiles}>
        <StatTile label={text.views} value={String(sum(insights.days.map((day) => day.views)))}>
          <Sparkline points={points} caption={text.daily} />
        </StatTile>
        <StatTile label={text.taps} value={String(sum(insights.days.map((day) => day.taps)))} />
      </div>
      <h3 className={styles.top}>{text.top}</h3>
      <BarList rows={insights.topItems.map((item) => ({ label: item.name, value: item.views }))} />
    </>
  )
}
