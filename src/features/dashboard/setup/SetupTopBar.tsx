import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { Button } from '@/shared/ui/Button'
import { IconLogOut } from '@/shared/ui/icons'
import { Logo } from '@/shared/ui/Logo'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { useLogOut } from '../useLogOut'
import styles from './SetupTopBar.module.css'

/** The wizard has no sidebar, so this slim bar carries the three things a new owner may need: home, the theme, the way out. */
export function SetupTopBar() {
  const logOut = useLogOut()
  return (
    <header className={styles.bar}>
      <Link className={styles.brand} to="/" aria-label={dashboardCopy.shell.home}>
        <Logo className={styles.logo} />
      </Link>
      <div className={styles.actions}>
        <ThemeToggle />
        <Button variant="secondary" size="sm" onClick={logOut}>
          <IconLogOut size={18} />
          {dashboardCopy.setup.logOut}
        </Button>
      </div>
    </header>
  )
}
