import { dashboardCopy } from '@/config/dashboardCopy'
import { useSession } from '@/shared/session/context'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { IconLogOut } from '@/shared/ui/icons'
import styles from './AccountChip.module.css'
import { useLogOut } from './useLogOut'

const text = dashboardCopy.shell.signedIn

/** Who is signed in, at the bottom of the sidebar (wide screens), with the way out. */
export function AccountChip() {
  const { session } = useSession()
  const logOut = useLogOut()
  if (!session) return null

  return (
    <div className={styles.chip} role="group" aria-label={text.label}>
      <div className={styles.who}>
        <Avatar name={session.account.name} />
        <div className={styles.names}>
          <span className={styles.name}>{session.account.name}</span>
          <span className={styles.email}>{session.account.email}</span>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={logOut}>
        <IconLogOut size={18} />
        {text.logOut}
      </Button>
    </div>
  )
}
