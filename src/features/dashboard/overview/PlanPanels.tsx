import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { freeCardsState, type Access, type Subscription } from '@/entities/account/subscription'
import { formatDay } from '@/shared/lib/date'
import { plural } from '@/shared/lib/plural'
import { buttonClass } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import styles from './overview.module.css'
import { PATHS } from './paths'

const text = dashboardCopy.overview.plan

function describe(access: Access, published: boolean): { title: string; body: string } {
  switch (access.kind) {
    case 'trial':
      return { title: plural(access.daysLeft, text.trial), body: text.trialBody.replace('{date}', formatDay(access.endsAt)) }
    case 'active':
      return {
        title: text.active.replace('{plan}', text.names[access.plan]),
        body: text.activeBody.replace('{date}', formatDay(access.renewsAt)),
      }
    case 'lapsed':
      return { title: text.lapsed.replace('{plan}', text.names[access.plan]), body: published ? text.lapsedBody : text.endedDraftBody }
    case 'trialEnded':
      return { title: text.trialEnded, body: published ? text.trialEndedBody : text.endedDraftBody }
  }
}

/**
 * Where the owner stands (trial days left, the plan and its renewal, or ended) and the way to the Account page. Once it
 * ended, only a published menu is "paused": a draft needs the plan and then publishing.
 */
export function PlanPanel({ access, published }: { access: Access; published: boolean }) {
  const { title, body } = describe(access, published)
  return (
    <Panel title={text.title}>
      <p className={styles.strong}>{title}</p>
      <p className={styles.body}>{body}</p>
      <Link className={buttonClass(access.kind === 'active' ? 'secondary' : 'primary')} to={PATHS.account}>
        {access.kind === 'active' ? text.manage : text.start}
      </Link>
    </Panel>
  )
}

/** How many free cards the owner gets, and whether they wait for a plan, are next, or have been sent. */
export function FreeCardsPanel({ subscription }: { subscription: Subscription }) {
  const words = dashboardCopy.overview.freeCards
  const state = freeCardsState(subscription)
  return (
    <Panel title={plural(subscription.freeCards.count, words.title)}>
      <p className={styles.body}>{state === 'sent' ? words.sent : state === 'due' ? words.ready : words.waiting}</p>
    </Panel>
  )
}
