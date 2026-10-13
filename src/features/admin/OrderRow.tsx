import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'
import type { OrderRecord } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { Avatar } from './Avatar'
import { formatDay } from './format'
import styles from './OrderRow.module.css'
import { Block, Pulse } from './Skeleton'
import { StatusPill } from './StatusPill'

type Props = {
  order: OrderRecord
  selected?: boolean
  /** The current query string, so the list keeps its filters when an order is opened. */
  search?: string
}

/** Stand-ins for `count` order lines, while the orders load. */
export function OrderRowsSkeleton({ count }: { count: number }) {
  return (
    <Pulse>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.row}>
          <Block width={40} height={40} shape="round" />
          <span className={styles.main}>
            <Block width="62%" height={16} />
            <Block width="38%" height={12} />
          </span>
          <span className={styles.side}>
            <Block width={56} height={16} />
            <Block width={76} height={20} shape="pill" />
          </span>
        </div>
      ))}
    </Pulse>
  )
}

/** One order as a line: who, when, how many cards, how much, and where it stands. Opens the order. */
export function OrderRow({ order, selected = false, search = '' }: Props) {
  return (
    <Link
      className={styles.row}
      to={{ pathname: `/admin/orders/${order.reference}`, search }}
      aria-current={selected ? 'true' : undefined}
    >
      <Avatar name={order.fullName} />
      <span className={styles.main}>
        <span className={styles.name}>{order.fullName}</span>
        <span className={styles.meta}>
          {formatDay(order.createdAt)} · {copy.admin.bundles[order.bundleId]}
        </span>
      </span>
      <span className={styles.side}>
        <span className={styles.total}>{formatPeso(order.total)}</span>
        <StatusPill status={order.status} />
      </span>
    </Link>
  )
}
