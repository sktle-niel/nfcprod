import { copy } from '@/config/copy'
import { salePrice, type Offer } from '@/entities/pricing/pricing'
import { formatPeso, formatPrice } from '@/shared/lib/money'
import plan from './Plan.module.css'

type Props = {
  /** Null while the offers load. */
  offer: Offer | null
  /** "per card", "/month" ... */
  unit: string
}

/** The price a customer pays. With a discount the regular price sits before it, struck through. */
export function PriceTag({ offer, unit }: Props) {
  const discounted = offer !== null && offer.discount > 0
  return (
    <p className={plan.price}>
      {discounted && (
        <del className={plan.was}>
          <span className={plan.hidden}>{copy.landing.pricing.was} </span>
          {formatPeso(offer.price)}
        </del>
      )}
      <strong>{formatPrice(offer ? salePrice(offer) : null)}</strong>
      <small>{unit}</small>
    </p>
  )
}

/** "20% off" beside the badge text, when the offer has a discount. */
export function DiscountChip({ offer }: { offer: Offer | null }) {
  if (!offer || offer.discount <= 0) return null
  return <span className={plan.chip}>{copy.landing.pricing.off.replace('{percent}', String(offer.discount))}</span>
}
