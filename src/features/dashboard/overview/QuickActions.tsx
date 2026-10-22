import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { buttonClass } from '@/shared/ui/Button'
import { IconDesign, IconPlus, IconShare } from '@/shared/ui/icons'
import { Panel } from '@/shared/ui/Panel'
import styles from './overview.module.css'
import { PATHS } from './paths'

const text = dashboardCopy.overview.quick

/** The three things an owner does most. */
export function QuickActions() {
  return (
    <Panel title={text.title}>
      <div className={styles.actions}>
        <Link className={buttonClass('secondary')} to={PATHS.menu}>
          <IconPlus size={18} />
          {text.addItem}
        </Link>
        <Link className={buttonClass('secondary')} to={PATHS.design}>
          <IconDesign size={18} />
          {text.look}
        </Link>
        <Link className={buttonClass('secondary')} to={PATHS.share}>
          <IconShare size={18} />
          {text.share}
        </Link>
      </div>
    </Panel>
  )
}
