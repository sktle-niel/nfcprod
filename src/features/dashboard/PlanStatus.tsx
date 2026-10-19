import { copy } from '@/config/copy'
import type { Access } from '@/entities/account/subscription'
import { formatDay } from '@/shared/lib/date'
import { plural } from '@/shared/lib/plural'
import styles from './DashboardPage.module.css'

const text = copy.dashboard

/** One line on where the owner stands (trial, active, ended), and what it means for the menu. */
export function PlanStatus({ access }: { access: Access }) {
  const [title, body, tone] = describe(access)
  return (
    <section className={styles.status} data-tone={tone} aria-labelledby="plan-status">
      <h2 id="plan-status" className={styles.statusTitle}>
        {title}
      </h2>
      <p className={styles.statusBody}>{body}</p>
    </section>
  )
}

function describe(access: Access): [string, string, 'good' | 'info' | 'warn'] {
  const status = text.status
  switch (access.kind) {
    case 'trial':
      return [plural(access.daysLeft, status.trial), status.trialBody.replace('{date}', formatDay(access.endsAt)), 'info']
    case 'active':
      return [
        status.active.replace('{plan}', text.plans.names[access.plan]),
        status.activeBody.replace('{date}', formatDay(access.renewsAt)),
        'good',
      ]
    case 'lapsed':
      return [status.lapsed.replace('{plan}', text.plans.names[access.plan].toLowerCase()), status.lapsedBody, 'warn']
    case 'trialEnded':
      return [status.trialEnded, status.trialEndedBody, 'warn']
  }
}
