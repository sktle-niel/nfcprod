import { useState } from 'react'
import { copy } from '@/config/copy'
import type { LocationRepository } from '@/data/locations'
import { orders, type OrderRepository } from '@/data/orders'
import type { OrderReceipt } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { Modal } from '@/shared/ui/Modal'
import { cardPrice } from '../landing.data'
import styles from './OrderDialog.module.css'
import { OrderForm } from './OrderForm'

type Props = {
  onClose: () => void
  repository?: OrderRepository
  /** Where the province, city and barangay lists come from. */
  locations?: LocationRepository | undefined
}

/** Modal "Get now" form on the shared modal sheet. After a sent order it shows the reference. */
export function OrderDialog({ onClose, repository = orders, locations }: Props) {
  const text = copy.order
  const [done, setDone] = useState<{ receipt: OrderReceipt; phone: string } | null>(null)

  return (
    <Modal
      wide
      title={done ? text.success.title : text.title}
      subtitle={
        done ? undefined : (
          <span className={styles.price}>
            {copy.landing.pricing.card.name} · {text.each.replace('{price}', formatPeso(cardPrice))}
          </span>
        )
      }
      closeLabel={text.close}
      onClose={onClose}
    >
      {(close) =>
        done ? (
          <div className={styles.done}>
            <p>{text.success.body.replace('{phone}', done.phone)}</p>
            <p className={styles.ref}>
              {text.success.reference}: <strong>{done.receipt.reference}</strong>
            </p>
            {done.receipt.demo && <p className={styles.demo}>{text.success.demo}</p>}
            <button type="button" className={styles.primary} onClick={close}>
              {text.success.done}
            </button>
          </div>
        ) : (
          <OrderForm repository={repository} locations={locations} onDone={(receipt, phone) => setDone({ receipt, phone })} />
        )
      }
    </Modal>
  )
}
