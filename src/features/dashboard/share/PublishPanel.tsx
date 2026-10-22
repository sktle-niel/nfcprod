import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { menuState } from '@/entities/business/status'
import { ownerErrorText } from '../ownerErrors'
import { useAsyncAction } from '../useAsyncAction'
import { useOwnedBusiness } from '../dashboardData'
import { Panel } from '@/shared/ui/Panel'
import { Switch } from '@/shared/ui/Switch'
import styles from './Share.module.css'

const text = dashboardCopy.share.publish

/** The publish switch. Its words come from `menuState`: a plan that ended pauses the menu whatever the switch says. */
export function PublishPanel() {
  const { business, actions, access } = useOwnedBusiness()
  const { run, busy, error } = useAsyncAction()
  const [notice, setNotice] = useState('')
  const state = menuState(business, access)
  const paused = state === 'paused'

  // Nothing is said about the menu until the plan is known: a guess could be the opposite of the truth.
  const describe =
    state === 'live' ? text.live : state === 'draft' ? text.draft : paused ? (business.published ? text.paused : text.endedDraft) : undefined

  const change = async (published: boolean) => {
    setNotice('')
    const outcome = await run(() => actions.setPublished(published))
    if (outcome.ok) setNotice(!published ? text.nowHidden : paused ? text.nowPaused : text.nowPublished)
  }

  return (
    <Panel title={text.title}>
      <Switch label={text.label} description={describe} checked={business.published} busy={busy} onChange={(next) => void change(next)} />
      {paused && (
        <p className={styles.note}>
          <Link to="/dashboard/account" className={styles.link}>
            {text.account}
          </Link>
        </p>
      )}
      <p role="status" className={styles.note}>
        {notice}
      </p>
      {error !== null && (
        <p role="alert" className={styles.error}>
          {ownerErrorText(error)}
        </p>
      )}
    </Panel>
  )
}
