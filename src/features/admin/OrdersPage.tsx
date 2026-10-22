import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { copy } from '@/config/copy'
import { ORDER_STATUSES } from '@/entities/order/order'
import type { OrderStatus } from '@/entities/order/order'
import { useAdminData } from './adminData'
import { filterOrders } from './filterOrders'
import { OrderDetail, OrderDetailSkeleton } from './OrderDetail'
import { OrderRow, OrderRowsSkeleton } from './OrderRow'
import styles from './OrdersPage.module.css'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Pagination } from './Pagination'
import { paginate, showTop } from './paging'
import { Panel } from '@/shared/ui/Panel'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { toStatus } from './status'
import { lastDays, SIZES } from './stats'
import ui from '@/shared/ui/ui.module.css'

const text = copy.admin.orders
const periods = [{ days: 0, label: text.allTime }, ...copy.admin.overview.ranges]
const PAGE_SIZE = 10

/**
 * Every order, filtered and paged, with the one you picked beside it. On phones it is the list first and
 * the order on its own screen (/admin/orders/NFC-...). The status, size, period and page sit in the
 * address, so a link, Back and Forward bring the same list back. None of it is personal data. The search
 * text is, so it stays in the page.
 */
export function OrdersPage() {
  const { loading, records, asOf } = useAdminData()
  const { reference } = useParams()
  const { search } = useLocation()
  const [params, setParams] = useSearchParams()
  const listRef = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')

  const status = toStatus(params.get('status')) ?? 'all'
  const size = SIZES.find((id) => id === params.get('size')) ?? 'all'
  const days = periods.find((period) => String(period.days) === params.get('period'))?.days ?? 0

  /** Sets (or, with null, removes) values in the address. */
  function update(changes: Record<string, string | null>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  // Any change of a filter starts again from the first page.
  const filter = (changes: Record<string, string | null>) => update({ ...changes, page: null })

  const from = days === 0 ? null : lastDays(asOf, days).from
  // The status counts ignore the status filter itself, so every tab shows how many it would give.
  const matching = useMemo(
    () => filterOrders(records, { query, status: 'all', size, from }),
    [records, query, size, from],
  )
  const shown = status === 'all' ? matching : matching.filter((order) => order.status === status)

  // The page in the address wins. Without one, show the page that holds the order that is open.
  const open = reference ? shown.findIndex((order) => order.reference === reference) : -1
  const requested = Number(params.get('page'))
  const wanted = Number.isInteger(requested) && requested > 0 ? requested : open >= 0 ? Math.floor(open / PAGE_SIZE) + 1 : 1
  const paged = paginate(shown, wanted, PAGE_SIZE)
  const selected = reference ? records.find((order) => order.reference === reference) : paged.rows[0]

  function goTo(next: number) {
    update({ page: next === 1 ? null : String(next) })
    showTop(listRef.current)
  }

  const count = (value: number) => (loading ? {} : { count: value })
  const tabs = [
    { value: 'all' as OrderStatus | 'all', label: text.allStatuses, ...count(matching.length) },
    ...ORDER_STATUSES.map((value) => ({
      value: value as OrderStatus | 'all',
      label: copy.admin.status[value],
      ...count(matching.filter((order) => order.status === value).length),
    })),
  ]

  return (
    <div className={styles.page} data-view={reference ? 'detail' : 'list'}>
      <title>{text.title}</title>
      <PageHeader title={text.title}>
        <div className={styles.tabs}>
          <SegmentedControl
            label={text.statusFilter}
            value={status}
            options={tabs}
            onChange={(value) => filter({ status: value === 'all' ? null : value })}
            disabled={loading}
          />
        </div>
      </PageHeader>

      <div className={styles.filters}>
        <input
          type="search"
          className={`${ui.field} ${styles.search}`}
          value={query}
          placeholder={text.search}
          aria-label={text.search}
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
          onChange={(event) => {
            setQuery(event.target.value)
            if (params.has('page')) update({ page: null })
          }}
        />
        <select
          className={ui.field}
          aria-label={text.size}
          value={size}
          disabled={loading}
          onChange={(event) => filter({ size: SIZES.find((id) => id === event.target.value) ?? null })}
        >
          <option value="all">{text.allSizes}</option>
          {SIZES.map((id) => (
            <option key={id} value={id}>
              {copy.admin.sizes[id]}
            </option>
          ))}
        </select>
        <select
          className={ui.field}
          aria-label={text.period}
          value={days}
          disabled={loading}
          onChange={(event) => filter({ period: Number(event.target.value) === 0 ? null : event.target.value })}
        >
          {periods.map((period) => (
            <option key={period.days} value={period.days}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.layout}>
        <Panel ref={listRef} className={styles.list}>
          {loading ? (
            <OrderRowsSkeleton count={PAGE_SIZE} />
          ) : paged.total === 0 ? (
            <p className={styles.none}>{text.none}</p>
          ) : (
            <>
              <ul className={styles.rows}>
                {paged.rows.map((order) => (
                  <li key={order.reference}>
                    <OrderRow order={order} search={search} selected={order.reference === selected?.reference} />
                  </li>
                ))}
              </ul>
              <Pagination paged={paged} onChange={goTo} compact />
            </>
          )}
        </Panel>

        <div className={styles.detail}>
          {loading && <OrderDetailSkeleton />}
          {!loading && selected && <OrderDetail key={selected.reference} order={selected} search={search} />}
          {!loading && reference && !selected && (
            <p role="alert" className={styles.missing}>
              {text.notFound}
              <Link className={styles.back} to={{ pathname: '/admin/orders', search }}>
                {text.title}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
