import { useState } from 'react'
import { copy } from '@/config/copy'
import { billingDemo } from '@/data/billing'
import { PLANS, type Access, type Plan } from '@/entities/account/subscription'
import { salePrice, yearSaving, type Pricing } from '@/entities/pricing/pricing'
import { formatPeso } from '@/shared/lib/money'
import styles from './DashboardPage.module.css'

const text = copy.dashboard.plans

type Props = {
  access: Access
  pricing: Pricing
  starting: Plan | null
  failed: boolean
  onStart: (plan: Plan) => void
}

/** Monthly or annual at the prices customers pay today, and the button that opens the checkout. */
export function PlanPicker({ access, pricing, starting, failed, onStart }: Props) {
  const current = access.kind === 'active' || access.kind === 'lapsed' ? access.plan : null
  const [chosen, setChosen] = useState<Plan>(current ?? 'year')
  const { percent } = yearSaving(pricing)
  const name = text.names[chosen]

  return (
    <section className={styles.panel} aria-labelledby="plans-title">
      <h2 id="plans-title" className={styles.panelTitle}>
        {text.title}
      </h2>
      <div className={styles.plans} role="radiogroup" aria-labelledby="plans-title">
        {PLANS.map((plan) => (
          <label key={plan} className={styles.plan} data-on={plan === chosen}>
            <input
              className={styles.radio}
              type="radio"
              name="plan"
              value={plan}
              checked={plan === chosen}
              disabled={access.kind === 'active'}
              onChange={() => setChosen(plan)}
            />
            <span className={styles.planName}>
              {text.names[plan]}
              {plan === current && <span className={styles.chip}>{text.current}</span>}
              {plan === 'year' && percent > 0 && <span className={styles.chip}>{text.save.replace('{percent}', String(percent))}</span>}
            </span>
            <span className={styles.planPrice}>
              <strong>{formatPeso(salePrice(pricing[plan]))}</strong>
              <small>{text.per[plan]}</small>
            </span>
          </label>
        ))}
      </div>

      {access.kind !== 'active' && (
        <>
          <button type="button" className={styles.primary} disabled={starting !== null} onClick={() => onStart(chosen)}>
            {starting ? text.starting : (access.kind === 'lapsed' ? text.restart : text.start).replace('{plan}', name.toLowerCase())}
          </button>
          <p role="status" className={failed ? styles.error : styles.small}>
            {failed ? text.error : billingDemo ? text.demo : text.secure}
          </p>
        </>
      )}
    </section>
  )
}
