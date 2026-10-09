import { useEffect, useId, useRef, useState } from 'react'
import { copy } from '@/config/copy'
import { orders, type OrderRepository } from '@/data/orders'
import type { BundleId, OrderReceipt } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { bundles } from '../landing.data'
import styles from './OrderDialog.module.css'
import { OrderForm } from './OrderForm'

type Props = {
  bundleId: BundleId
  onClose: () => void
  repository?: OrderRepository
}

/** Modal "Get now" form. Uses the native dialog for focus trapping, Esc and the backdrop. */
export function OrderDialog({ bundleId, onClose, repository = orders }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [done, setDone] = useState<{ receipt: OrderReceipt; phone: string } | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const bundle = bundles.find((item) => item.id === bundleId)
  const name = copy.landing.pricing.bundles.items[bundleId].name

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      data-lenis-prevent
      onClose={onClose}
      onClick={(event) => {
        // A click on the dimmed area lands on the dialog element itself, not on the sheet.
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <div className={styles.sheet}>
        <header className={styles.head}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {done ? copy.order.success.title : copy.order.title}
            </h2>
            {!done && bundle && (
              <p className={styles.sub}>
                {name} · {formatPeso(bundle.price)}
              </p>
            )}
          </div>
          <button type="button" className={styles.close} aria-label={copy.order.close} onClick={() => ref.current?.close()}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </header>

        {done ? (
          <div className={styles.done}>
            <p>{copy.order.success.body.replace('{phone}', done.phone)}</p>
            <p className={styles.ref}>
              {copy.order.success.reference}: <strong>{done.receipt.reference}</strong>
            </p>
            {done.receipt.demo && <p className={styles.demo}>{copy.order.success.demo}</p>}
            <button type="button" className={styles.primary} onClick={() => ref.current?.close()}>
              {copy.order.success.done}
            </button>
          </div>
        ) : (
          <OrderForm bundleId={bundleId} repository={repository} onDone={(receipt, phone) => setDone({ receipt, phone })} />
        )}
      </div>
    </dialog>
  )
}
