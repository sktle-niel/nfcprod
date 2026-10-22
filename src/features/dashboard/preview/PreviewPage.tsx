import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { menuState } from '@/entities/business/status'
import { MenuFrame } from '@/features/menu/MenuFrame'
import { buttonClass } from '@/shared/ui/Button'
import { IconBack } from '@/shared/ui/icons'
import { useOwnedBusiness } from '../dashboardData'
import styles from './PreviewPage.module.css'

const text = dashboardCopy.share.preview

/**
 * The owner's own menu, draft or live, as customers see it. It sits outside the dashboard shell and has only a slim bar of
 * the app's own look above the menu: the way back, and a note while customers cannot see the menu yet. The public address
 * cannot show a draft, and in demo mode a new tab has none of this tab's data, so "Open menu" leads here.
 */
export function PreviewPage() {
  const { business, menu, access } = useOwnedBusiness()
  const state = menuState(business, access)
  // While the plan has not loaded (`unknown`) nothing is said that could be wrong.
  const note = state === 'draft' ? text.note : state === 'paused' ? text.notePaused : ''

  return (
    <div className={styles.preview}>
      <title>{text.title}</title>
      <div className={styles.bar}>
        <nav aria-label={text.bar}>
          <Link to="/dashboard" className={buttonClass('secondary', 'sm')}>
            <IconBack size={16} />
            {text.back}
          </Link>
        </nav>
        {note !== '' && <p className={styles.note}>{note}</p>}
      </div>
      <MenuFrame business={business} menu={menu} />
    </div>
  )
}
