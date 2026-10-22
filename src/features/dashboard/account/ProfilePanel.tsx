import { dashboardCopy } from '@/config/dashboardCopy'
import type { Account } from '@/entities/account/account'
import { Button } from '@/shared/ui/Button'
import { IconLogOut } from '@/shared/ui/icons'
import { Panel } from '@/shared/ui/Panel'
import styles from './ProfilePanel.module.css'

const text = dashboardCopy.account.profile

type Props = { account: Account; onLogOut: () => void }

/** Who the owner is and how they sign in, and the way out. */
export function ProfilePanel({ account, onLogOut }: Props) {
  return (
    <Panel title={text.title}>
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>{text.name}</dt>
          <dd>{account.name}</dd>
        </div>
        <div className={styles.row}>
          <dt>{text.email}</dt>
          <dd>{account.email}</dd>
        </div>
        <div className={styles.row}>
          <dt>{text.method}</dt>
          <dd>{text.methods[account.method]}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onLogOut}>
          <IconLogOut />
          {text.logOut}
        </Button>
      </div>
    </Panel>
  )
}
