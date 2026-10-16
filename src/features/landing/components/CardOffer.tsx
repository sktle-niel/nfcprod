import { useState, type CSSProperties } from 'react'
import { copy } from '@/config/copy'
import { PLATFORMS } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { cardPrice } from '../landing.data'
import { OrderDialog } from '../order/OrderDialog'
import styles from './CardOffer.module.css'
import { CheckList } from './CheckList'
import { PlatformIcon } from './PlatformIcon'

/** The review card offer: one price per card, any mix of platforms, ordered through the "Get now" form. */
export function CardOffer() {
  const text = copy.landing.pricing.card
  const [ordering, setOrdering] = useState(false)

  return (
    <div className={styles.wrap}>
      <h3 className={`${styles.title} reveal`}>{text.title}</h3>
      <p className={`${styles.body} reveal`} style={{ '--i': 1 } as CSSProperties}>
        {text.body}
      </p>
      <div className={`${styles.card} reveal`} style={{ '--i': 2 } as CSSProperties}>
        <h4 className={styles.name}>{text.name}</h4>
        <strong className={styles.price}>{formatPeso(cardPrice)}</strong>
        <CheckList items={text.perks} />
        <span className={styles.icons}>
          {PLATFORMS.map((platform) => (
            <PlatformIcon key={platform} platform={platform} className={styles.icon} />
          ))}
        </span>
        <button
          type="button"
          className={styles.cta}
          aria-label={`${text.getNow}: ${text.name}`}
          onClick={() => setOrdering(true)}
        >
          {text.getNow}
        </button>
      </div>
      {ordering && <OrderDialog onClose={() => setOrdering(false)} />}
    </div>
  )
}
