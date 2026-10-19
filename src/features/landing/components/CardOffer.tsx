import { useState, type CSSProperties } from 'react'
import { copy } from '@/config/copy'
import { PLATFORMS } from '@/entities/order/order'
import { salePrice, type Offer } from '@/entities/pricing/pricing'
import { OrderDialog } from '../order/OrderDialog'
import styles from './CardOffer.module.css'
import { CheckList } from './CheckList'
import plan from './Plan.module.css'
import { PlatformIcon } from './PlatformIcon'
import { DiscountChip, PriceTag } from './PriceTag'

type Props = {
  /** Null while the offers load. */
  offer: Offer | null
}

/** The review card offer: one price per card, any mix of platforms, ordered through the "Get now" form. */
export function CardOffer({ offer }: Props) {
  const text = copy.landing.pricing.card
  const [ordering, setOrdering] = useState(false)

  return (
    <>
      <article className={`${plan.card} reveal`} style={{ '--i': 1 } as CSSProperties}>
        <span className={plan.badge}>
          {text.badge}
          <DiscountChip offer={offer} />
        </span>
        <h3 className={plan.name}>{text.name}</h3>
        <div className={plan.priceBox}>
          <PriceTag offer={offer} unit={text.unit} />
          <p className={plan.note}>{text.note}</p>
        </div>
        <p className={plan.body}>{text.body}</p>
        <div className={plan.perks}>
          <CheckList items={offer?.perks ?? []} />
          <span className={styles.icons}>
            {PLATFORMS.map((platform) => (
              <PlatformIcon key={platform} platform={platform} className={styles.icon} />
            ))}
          </span>
        </div>
        <button
          type="button"
          className={plan.cta}
          aria-label={`${text.getNow}: ${text.name}`}
          disabled={offer === null}
          onClick={() => setOrdering(true)}
        >
          {text.getNow}
        </button>
      </article>
      {/* Outside the card, so the card's hover lift never moves the open dialog. */}
      {ordering && offer !== null && <OrderDialog price={salePrice(offer)} onClose={() => setOrdering(false)} />}
    </>
  )
}
