import { dashboardCopy } from '@/config/dashboardCopy'
import { freeCardsState, type Subscription } from '@/entities/account/subscription'
import { plural } from '@/shared/lib/plural'
import { Panel } from '@/shared/ui/Panel'
import styles from './AccountPage.module.css'

const text = dashboardCopy.account.freeCards

/** How many free NFC cards come with the plan, and whether they wait, are next or are sent. */
export function FreeCardsPanel({ subscription }: { subscription: Subscription }) {
  const state = freeCardsState(subscription)
  const body = state === 'sent' ? text.sent : state === 'due' ? text.ready : text.waiting
  return (
    <Panel title={plural(subscription.freeCards.count, { one: text.titleOne, many: text.title })}>
      <p className={styles.note}>{body}</p>
    </Panel>
  )
}
