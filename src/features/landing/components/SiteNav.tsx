import { Link } from 'react-router-dom'
import { copy } from '@/config/copy'
import { env } from '@/config/env'
import { authLink, OWNER_HOME, useStartLink } from '@/shared/session/authLink'
import { useSession } from '@/shared/session/context'
import { Logo } from '@/shared/ui/Logo'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import styles from './SiteNav.module.css'

export function SiteNav() {
  const { nav } = copy.landing
  const { session } = useSession()
  const start = useStartLink()
  return (
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label={env.appName}>
        <Logo className={styles.logo} />
      </a>
      <nav className={styles.pill} aria-label="Sections">
        <a href="#how">{nav.how}</a>
        <a href="#cards">{nav.cards}</a>
        <a href="#pricing">{nav.pricing}</a>
      </nav>
      <div className={styles.actions}>
        <ThemeToggle />
        {session ? (
          <Link className={styles.login} to={OWNER_HOME}>
            {nav.dashboard}
          </Link>
        ) : (
          <Link className={styles.login} to={authLink('login')}>
            {nav.login}
          </Link>
        )}
        <Link className={styles.cta} to={start}>
          {nav.cta}
        </Link>
      </div>
    </header>
  )
}
