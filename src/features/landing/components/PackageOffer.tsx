import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'
import { yearSaving, type Pricing } from '@/entities/pricing/pricing'
import { formatPeso } from '@/shared/lib/money'
import { useStartLink } from '@/shared/session/authLink'
import { CheckList } from './CheckList'
import plan from './Plan.module.css'
import { DiscountChip, PriceTag } from './PriceTag'

export type Billing = 'month' | 'year'

type Props = {
  billing: Billing
  /** Null while the offers load. */
  pricing: Pricing | null
  /** Position in the pricing row, for the staggered reveal. */
  index: number
}

/** The NFC + Website package for one billing period. Monthly and annual each get their own card. */
export function PackageOffer({ billing, pricing, index }: Props) {
  const text = copy.landing.pricing.package
  const start = useStartLink()
  const offer = pricing ? pricing[billing] : null
  const year = pricing ? yearSaving(pricing) : null
  // Only a real saving is worth a mark and a note.
  const saves = year !== null && year.saving > 0
  const note =
    billing === 'month'
      ? text.notes.month
      : saves
        ? text.notes.year.replace('{month}', formatPeso(year.perMonth)).replace('{saving}', formatPeso(year.saving))
        : text.notes.yearOnly

  return (
    <article className={`${plan.card} reveal`} style={{ '--i': index } as CSSProperties}>
      <span className={plan.badge}>
        {text.badges[billing]}
        {billing === 'year' && saves && year.percent > 0 && (
          <span className={plan.chip}>{text.save.replace('{percent}', String(year.percent))}</span>
        )}
        <DiscountChip offer={offer} />
      </span>
      <h3 className={plan.name}>{text.name}</h3>
      <div className={plan.priceBox}>
        <PriceTag offer={offer} unit={text.per[billing]} />
        <p className={plan.note}>{note}</p>
      </div>
      <p className={plan.body}>{text.body}</p>
      <div className={plan.perks}>
        <CheckList items={offer?.perks ?? []} />
      </div>
      <Link className={plan.cta} to={start}>
        {text.cta}
      </Link>
    </article>
  )
}
