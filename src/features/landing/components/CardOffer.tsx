import { useState, type CSSProperties } from 'react'
import { copy } from '@/config/copy'
import { PLATFORMS } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { cardPrice } from '../landing.data'
import { OrderDialog } from '../order/OrderDialog'
import styles from './CardOffer.module.css'
import { CheckList } from './CheckList'
import plan from './Plan.module.css'
import { PlatformIcon } from './PlatformIcon'

/** The review card offer: one price per card, any mix of platforms, ordered through the "Get now" form. */
export function CardOffer() {
  const text = copy.landing.pricing.card
  const [ordering, setOrdering] = useState(false)

  return (
    <>
      <article className={`${plan.card} reveal`} style={{ '--i': 1 } as CSSProperties}>
        <span className={plan.badge}>{text.badge}</span>
        <h3 className={plan.name}>{text.name}</h3>
        <div className={plan.priceBox}>
          <p className={plan.price}>
            <strong>{formatPeso(cardPrice)}</strong>
            <small>{text.unit}</small>
          </p>
        </div>
        <p className={plan.body}>{text.body}</p>
        <CheckList items={text.perks} />
        <span className={styles.icons}>
          {PLATFORMS.map((platform) => (
            <PlatformIcon key={platform} platform={platform} className={styles.icon} />
          ))}
        </span>
        <button
          type="button"
          className={plan.cta}
          aria-label={`${text.getNow}: ${text.name}`}
          onClick={() => setOrdering(true)}
        >
          {text.getNow}
        </button>
      </article>
      {/* Outside the card, so the card's hover lift never moves the open dialog. */}
      {ordering && <OrderDialog onClose={() => setOrdering(false)} />}
    </>
  )
}
