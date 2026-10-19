import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'
import { formatPeso } from '@/shared/lib/money'
import { useStartLink } from '@/shared/session/authLink'
import { BILLINGS, packagePlans, type Billing } from '../landing.data'
import { CheckList } from './CheckList'
import styles from './PackageOffer.module.css'
import plan from './Plan.module.css'

// What a year saves against 12 single months.
const fullYear = packagePlans.month * 12
const saving = fullYear - packagePlans.year
const percent = Math.floor((saving / fullYear) * 100)
const perMonthOfYear = Math.round(packagePlans.year / 12 / 100) * 100

/** The NFC + Website package, paid by the month or by the year. It opens on the year, the plan we want owners to pick. */
export function PackageOffer() {
  const text = copy.landing.pricing.package
  const [billing, setBilling] = useState<Billing>('year')
  const start = useStartLink()
  const note =
    billing === 'year'
      ? text.notes.year.replace('{month}', formatPeso(perMonthOfYear)).replace('{saving}', formatPeso(saving))
      : text.notes.month

  return (
    <article className={`${plan.card} reveal`} style={{ '--i': 2 } as CSSProperties}>
      <span className={plan.badge}>{text.badge}</span>
      <h3 className={plan.name}>{text.name}</h3>
      <div className={styles.billing} role="radiogroup" aria-label={text.billing}>
        {BILLINGS.map((option) => (
          <label key={option} className={`${styles.option} ${option === billing ? styles.on : ''}`}>
            <input
              className={styles.radio}
              type="radio"
              name="billing"
              value={option}
              checked={option === billing}
              onChange={() => setBilling(option)}
            />
            {text.plans[option]}
            {option === 'year' && <span className={styles.save}>{text.save.replace('{percent}', String(percent))}</span>}
          </label>
        ))}
      </div>
      <div className={plan.priceBox} aria-live="polite">
        <p className={plan.price}>
          <strong>{formatPeso(packagePlans[billing])}</strong>
          <small>{text.per[billing]}</small>
        </p>
        <p className={plan.note}>{note}</p>
      </div>
      <p className={plan.body}>{text.body}</p>
      <CheckList items={text.features} />
      <Link className={plan.cta} to={start}>
        {text.cta}
      </Link>
    </article>
  )
}
