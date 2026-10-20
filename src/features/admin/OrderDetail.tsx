import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'
import { googleMapsUrl } from '@/entities/location/pin'
import { countCards, ORDER_STATUSES } from '@/entities/order/order'
import type { OrderRecord, OrderStatus } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { plural } from '@/shared/lib/plural'
import { useAdminData } from './adminData'
import { formatDateTime, formatItems, formatMobile, formatPin } from './format'
import { IconBack, IconPhone } from './icons'
import styles from './OrderDetail.module.css'
import { Block, Pulse } from './Skeleton'
import { toStatus } from './status'
import { StatusPill } from './StatusPill'
import ui from './ui.module.css'

const text = copy.admin.orders

/** Stand-in for an order, while the orders load. It has the same frame as the real one. */
export function OrderDetailSkeleton() {
  return (
    <div className={styles.detail}>
      <Pulse className={styles.skeleton}>
        <div className={styles.head}>
          <div className={styles.skeletonTitle}>
            <Block width={170} height={24} />
            <Block width={130} height={14} />
          </div>
          <Block width={76} height={22} shape="pill" />
        </div>
        <div className={styles.grid}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={styles.item}>
              <Block width={64} height={12} />
              <Block width="70%" height={16} />
              <Block width="50%" height={14} />
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <Block width={110} height={44} shape="pill" />
          <Block width={150} height={44} />
        </div>
      </Pulse>
    </div>
  )
}

type Props = {
  order: OrderRecord
  /** The current query string, so Back returns to the same filtered list. */
  search: string
}

/** Everything about one order, with the call button and the status. */
export function OrderDetail({ order, search }: Props) {
  const { setStatus } = useAdminData()
  const headingId = useId()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function change(next: OrderStatus) {
    setPending(true)
    setFailed(false)
    try {
      await setStatus(order.reference, next)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <article className={styles.detail} aria-labelledby={headingId}>
      <Link className={styles.back} to={{ pathname: '/admin/orders', search }}>
        <IconBack size={18} />
        {text.title}
      </Link>

      <header className={styles.head}>
        <div>
          <h2 id={headingId} className={styles.reference}>
            {order.reference}
          </h2>
          <p className={styles.when}>{formatDateTime(order.createdAt)}</p>
        </div>
        <StatusPill status={order.status} />
      </header>

      <dl className={styles.grid}>
        <div className={styles.item}>
          <dt>{text.customer}</dt>
          <dd>
            {order.fullName}
            <a className={styles.link} href={`tel:${order.phone}`}>
              {formatMobile(order.phone)}
            </a>
          </dd>
        </div>
        <div className={styles.item}>
          <dt>{text.delivery}</dt>
          <dd>
            {order.street}, {order.barangay}
            <span className={styles.soft}>
              {order.city}, {order.province}
            </span>
            <span className={styles.soft}>{order.landmark}</span>
          </dd>
        </div>
        <div className={styles.item}>
          <dt>{text.order}</dt>
          <dd>
            {plural(countCards(order.items), copy.admin.cards)}
            <span className={styles.soft}>{formatItems(order.items)}</span>
          </dd>
        </div>
        <div className={styles.item}>
          <dt>{text.total}</dt>
          <dd className={styles.total}>{formatPeso(order.total)}</dd>
        </div>
        <div className={`${styles.item} ${styles.wide}`}>
          <dt>{text.pin}</dt>
          <dd>
            {order.pin ? (
              <>
                <span className={styles.coords}>{formatPin(order.pin)}</span>
                <a className={`${styles.link} ${styles.pinLink}`} href={googleMapsUrl(order.pin)} target="_blank" rel="noopener noreferrer">
                  {text.openPin}
                </a>
              </>
            ) : (
              <span className={styles.soft}>{text.noPin}</span>
            )}
          </dd>
        </div>
      </dl>

      <footer className={styles.actions}>
        <a className={styles.call} href={`tel:${order.phone}`}>
          <IconPhone size={18} />
          {text.call}
        </a>
        <label className={styles.status}>
          {text.statusLabel}
          <select
            className={ui.field}
            value={order.status}
            disabled={pending}
            onChange={(event) => {
              const next = toStatus(event.target.value)
              if (next) void change(next)
            }}
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {copy.admin.status[status]}
              </option>
            ))}
          </select>
        </label>
        {failed && (
          <p role="alert" className={styles.error}>
            {text.updateError}
          </p>
        )}
      </footer>
    </article>
  )
}
