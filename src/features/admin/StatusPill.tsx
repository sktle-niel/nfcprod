import { copy } from '@/config/copy'
import type { OrderStatus } from '@/entities/order/order'
import styles from './StatusPill.module.css'

/** The status as a word, with a dot. The word carries the meaning; the colors only support it. */
export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={styles.pill} data-status={status}>
      <span className={styles.dot} aria-hidden="true" />
      {copy.admin.status[status]}
    </span>
  )
}
