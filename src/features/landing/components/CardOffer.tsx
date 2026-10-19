import { useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { copy } from '@/config/copy'
import { PLATFORMS } from '@/entities/order/order'
import { salePrice, type Offer } from '@/entities/pricing/pricing'
import { authLink, CARD_ORDER, ORDER_PARAM } from '@/shared/session/authLink'
import { useSession } from '@/shared/session/context'
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

/**
 * The review card offer: one price per card, any mix of platforms, ordered through the "Get now" form.
 * Orders need an account: "Get now" signs the visitor up first, then comes back with the form open.
 */
export function CardOffer({ offer }: Props) {
  const text = copy.landing.pricing.card
  const { session } = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  // Back from sign-up with ?order=cards: the form opens by itself.
  const ordering = open || (session !== null && params.get(ORDER_PARAM) === 'cards')

  function getNow() {
    if (session) setOpen(true)
    else navigate(`/${authLink('signup', CARD_ORDER)}`)
  }

  function close() {
    setOpen(false)
    if (params.has(ORDER_PARAM)) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete(ORDER_PARAM)
          return next
        },
        { replace: true },
      )
    }
  }

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
          onClick={getNow}
        >
          {text.getNow}
        </button>
      </article>
      {/* Outside the card, so the card's hover lift never moves the open dialog. */}
      {ordering && offer !== null && <OrderDialog price={salePrice(offer)} name={session?.account.name} onClose={close} />}
    </>
  )
}
