import { copy } from '@/config/copy'
import { env } from '@/config/env'
import { Logo } from '@/shared/ui/Logo'
import { ThemeToggle } from '@/shared/ui/ThemeToggle'
import { CTA_HREF } from '../landing.data'
import styles from './SiteNav.module.css'

export function SiteNav() {
  const { nav } = copy.landing
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
        <a className={styles.cta} href={CTA_HREF}>
          {nav.cta}
        </a>
      </div>
    </header>
  )
}
