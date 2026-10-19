import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'
import { yearSaving, type Prices } from '@/entities/pricing/pricing'
import { formatPeso, formatPrice } from '@/shared/lib/money'
import { useStartLink } from '@/shared/session/authLink'
import { CheckList } from './CheckList'
import styles from './PackageOffer.module.css'
import plan from './Plan.module.css'

export type Billing = 'month' | 'year'

type Props = {
  billing: Billing
  /** Null while the prices load. */
  prices: Prices | null
  /** Position in the pricing row, for the staggered reveal. */
  index: number
}

/** The NFC + Website package for one billing period. Monthly and annual each get their own card. */
export function PackageOffer({ billing, prices, index }: Props) {
  const text = copy.landing.pricing.package
  const start = useStartLink()
  const year = prices ? yearSaving(prices) : null
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
          <span className={styles.save}>{text.save.replace('{percent}', String(year.percent))}</span>
        )}
      </span>
      <h3 className={plan.name}>{text.name}</h3>
      <div className={plan.priceBox}>
        <p className={plan.price}>
          <strong>{formatPrice(prices ? prices[billing] : null)}</strong>
          <small>{text.per[billing]}</small>
        </p>
        <p className={plan.note}>{note}</p>
      </div>
      <p className={plan.body}>{text.body}</p>
      <div className={plan.perks}>
        <CheckList items={text.features} />
      </div>
      <Link className={plan.cta} to={start}>
        {text.cta}
      </Link>
    </article>
  )
}
