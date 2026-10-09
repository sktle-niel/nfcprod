import logoDark from '@/assets/brand/logo-dark.webp'
import logoLight from '@/assets/brand/logo-light.webp'
import { copy } from '@/config/copy'
import { env } from '@/config/env'
import { CTA_HREF } from '../landing.data'
import styles from './SiteNav.module.css'
import { ThemeToggle } from './ThemeToggle'

export function SiteNav() {
  const { nav } = copy.landing
  return (
    <header className={styles.header}>
      <a className={styles.brand} href="/" aria-label={env.appName}>
        <img className={styles.logoLight} src={logoLight} width={700} height={146} alt="" decoding="async" />
        <img className={styles.logoDark} src={logoDark} width={700} height={144} alt="" decoding="async" />
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
