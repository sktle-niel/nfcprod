import { useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { billingDemo } from '@/data/billing'
import { PLANS, type Access, type Plan } from '@/entities/account/subscription'
import { salePrice, yearSaving, type Pricing } from '@/entities/pricing/pricing'
import { formatPeso } from '@/shared/lib/money'
import { Button } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { Chip } from './Chip'
import styles from './PlanPicker.module.css'

const text = dashboardCopy.account.plans

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
  const buttonText = (access.kind === 'lapsed' ? text.restart : text.start).replace('{plan}', text.names[chosen].toLowerCase())

  return (
    <Panel title={text.title}>
      <div className={styles.body}>
        <div className={styles.plans} role="radiogroup" aria-label={text.title}>
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
                {plan === current && <Chip>{text.current}</Chip>}
                {plan === 'year' && percent > 0 && <Chip>{text.save.replace('{percent}', String(percent))}</Chip>}
              </span>
              <span className={styles.planPrice}>
                <strong>{formatPeso(salePrice(pricing[plan]))}</strong>
                <small>{text.per[plan]}</small>
              </span>
            </label>
          ))}
        </div>

        {access.kind !== 'active' && (
          <Button busy={starting !== null} onClick={() => onStart(chosen)}>
            {starting ? text.starting : buttonText}
          </Button>
        )}
        {/* Always here, so the change from "Start" to "Your plan is on" is announced when the button goes away. */}
        <p role="status" className={failed ? styles.error : styles.note}>
          {access.kind === 'active'
            ? text.started.replace('{plan}', text.names[access.plan].toLowerCase())
            : failed
              ? text.error
              : billingDemo
                ? text.demo
                : text.secure}
        </p>
      </div>
    </Panel>
  )
}
