import { copy } from '@/config/copy'
import { env } from '@/config/env'
import styles from './SiteFooter.module.css'

const YEAR = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      © {YEAR} {env.appName}. {copy.landing.footer}
    </footer>
  )
}
