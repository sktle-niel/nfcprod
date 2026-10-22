import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { MenuState } from '@/entities/business/status'
import { buttonClass } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import styles from './AccountPage.module.css'
import { Chip } from './Chip'

const text = dashboardCopy.account.menu

/** What the public menu is doing, in the words of every page (`menuState`). Never "Live" for a draft or a missing menu. */
export function MenuSitePanel({ state, published }: { state: MenuState; published: boolean }) {
  if (state === 'unknown') return null
  const chip = <Chip tone={state === 'paused' ? 'warn' : undefined}>{text[state]}</Chip>
  return (
    <Panel title={text.title} action={chip}>
      <p className={styles.note}>{state === 'paused' && !published ? text.body.pausedDraft : text.body[state]}</p>
      {(state === 'draft' || state === 'none') && (
        <Link className={buttonClass('secondary')} to={state === 'draft' ? '/dashboard/share' : '/dashboard/setup'}>
          {state === 'draft' ? text.publish : text.setup}
        </Link>
      )}
    </Panel>
  )
}
