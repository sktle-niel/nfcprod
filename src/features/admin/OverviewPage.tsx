import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'
import { BUNDLE_IDS, PLATFORMS } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { useAdminData } from './adminData'
import { BarList, BarListSkeleton } from './BarList'
import { formatDay } from './format'
import { MiniBars } from './MiniBars'
import { OrderRow, OrderRowsSkeleton } from './OrderRow'
import styles from './OverviewPage.module.css'
import { PageHeader } from './PageHeader'
import { Panel } from './Panel'
import { SegmentedControl } from './SegmentedControl'
import { Sparkline } from './Sparkline'
import { StatTile } from './StatTile'
import { before, bucketSize, buckets, change, lastDays, topProvinces, totals, within } from './stats'

const text = copy.admin.overview
const ranges = text.ranges.map((range) => ({ value: range.days, label: range.label }))

// Room the plot or the list takes under a number, so the skeleton of a tile is as tall as the tile.
const PLOT_HEIGHT = 84
const LIST_HEIGHT = 127

function cardCount(cards: Record<string, number>): number {
  return Object.values(cards).reduce((sum, count) => sum + count, 0)
}

/** The state of the business over a period: headline numbers, who ordered last, and where. */
export function OverviewPage() {
  const { loading, records, asOf } = useAdminData()
  const [days, setDays] = useState(30)

  const view = useMemo(() => {
    const span = lastDays(asOf, days)
    const inRange = within(records, span)
    const size = bucketSize(days)
    const series = buckets(inRange, span, size).map((bucket) => ({
      label: size === 1 ? formatDay(bucket.from) : `${formatDay(bucket.from)} – ${formatDay(bucket.to - 1)}`,
      orders: bucket.orders,
      revenue: bucket.revenue,
    }))
    return {
      inRange,
      series,
      current: totals(inRange),
      previous: totals(within(records, before(span))),
      provinces: topProvinces(inRange),
    }
  }, [records, asOf, days])

  const { inRange, series, current, previous, provinces } = view
  const versus = text.versus.replace('{days}', String(days))
  const toConfirm = records.filter((order) => order.status === 'new').length
  const recent = inRange.slice(0, 6)

  return (
    <>
      <title>{text.title}</title>
      <PageHeader title={text.title}>
        {!loading && toConfirm > 0 && (
          <Link className={styles.cta} to="/admin/orders?status=new">
            {text.toConfirm}
            <span className={styles.badge}>{toConfirm}</span>
          </Link>
        )}
      </PageHeader>

      <div className={styles.filters}>
        <SegmentedControl label={text.period} value={days} options={ranges} onChange={setDays} disabled={loading} />
      </div>

      <div className={styles.tiles}>
        <StatTile
          label={text.orders}
          value={String(current.orders)}
          delta={change(current.orders, previous.orders)}
          versus={versus}
          loading={loading}
          bodyHeight={PLOT_HEIGHT}
        >
          <MiniBars points={series.map((s) => ({ label: s.label, value: s.orders }))} caption={text.orders} />
        </StatTile>
        <StatTile
          label={text.revenue}
          value={formatPeso(current.revenue)}
          delta={change(current.revenue, previous.revenue)}
          versus={versus}
          loading={loading}
          bodyHeight={PLOT_HEIGHT}
        >
          <Sparkline
            points={series.map((s) => ({ label: s.label, value: s.revenue }))}
            caption={text.revenue}
            format={formatPeso}
          />
        </StatTile>
        <StatTile
          label={text.average}
          value={formatPeso(current.average)}
          delta={change(current.average, previous.average)}
          versus={versus}
          loading={loading}
          bodyHeight={LIST_HEIGHT}
        >
          <BarList rows={BUNDLE_IDS.map((id) => ({ label: copy.admin.bundles[id], value: current.bundles[id] }))} />
        </StatTile>
        <StatTile
          label={text.cards}
          value={String(cardCount(current.cards))}
          delta={change(cardCount(current.cards), cardCount(previous.cards))}
          versus={versus}
          loading={loading}
          bodyHeight={LIST_HEIGHT}
        >
          <BarList rows={PLATFORMS.map((platform) => ({ label: copy.order.cardNames[platform], value: current.cards[platform] }))} />
        </StatTile>
      </div>

      <div className={styles.lower}>
        <Panel
          title={text.recent}
          action={
            <Link className={styles.more} to="/admin/orders">
              {text.all}
            </Link>
          }
        >
          {loading ? (
            <OrderRowsSkeleton count={6} />
          ) : recent.length === 0 ? (
            <p className={styles.none}>{text.none}</p>
          ) : (
            <ul className={styles.list}>
              {recent.map((order) => (
                <li key={order.reference}>
                  <OrderRow order={order} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={text.provinces}>
          {loading ? (
            <BarListSkeleton rows={5} />
          ) : provinces.length === 0 ? (
            <p className={styles.none}>{text.none}</p>
          ) : (
            <BarList rows={provinces} />
          )}
        </Panel>
      </div>
    </>
  )
}
