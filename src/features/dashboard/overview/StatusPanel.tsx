import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Access } from '@/entities/account/subscription'
import type { Business } from '@/entities/business/business'
import { menuState } from '@/entities/business/status'
import { buttonClass } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { menuLink } from '../menuLink'
import { MenuLink } from './MenuLink'
import styles from './overview.module.css'
import { PATHS } from './paths'

const text = dashboardCopy.overview.status

/** Whether the public menu is on, and what to do about it. The state comes from `menuState`, like on Share and Account. */
export function StatusPanel({ business, access }: { business: Business; access: Access }) {
  const state = menuState(business, access)
  if (state === 'none' || state === 'unknown') return null
  const words = text[state]
  // A menu that was never published has nothing to switch back on: it needs a plan first, then publishing.
  const body = state === 'paused' && !business.published ? text.paused.bodyDraft : words.body

  return (
    <Panel title={words.title} className={`${styles.status} ${styles[state]}`}>
      <p className={styles.body}>{body}</p>
      {state === 'live' ? (
        <MenuLink url={menuLink(business.slug)} />
      ) : (
        <Link className={buttonClass('primary')} to={state === 'draft' ? PATHS.share : PATHS.account}>
          {text[state].action}
        </Link>
      )}
    </Panel>
  )
}
