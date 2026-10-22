import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../Logo'
import { ThemeToggle } from '../ThemeToggle'
import styles from './AppShell.module.css'
import { ShellNav, type ShellNavItem } from './ShellNav'

type Props = {
  /** Name of the navigation landmark. */
  label: string
  /** Where the brand link goes. */
  home: string
  brandLabel: string
  items: readonly ShellNavItem[]
  skipLabel: string
  /** Id of the main element, which the skip link points at. */
  mainId: string
  /** In the top strip, left of the theme toggle. */
  topbarExtra?: ReactNode
  /** Wide screens only: pinned to the bottom of the sidebar panel. */
  sidebarFooter?: ReactNode
  children: ReactNode
}

/** The frame of a signed-in area: a sidebar (a tab bar on phones), a top strip with the theme toggle, and the page. */
export function AppShell({ label, home, brandLabel, items, skipLabel, mainId, topbarExtra, sidebarFooter, children }: Props) {
  return (
    <div className={styles.shell}>
      <meta name="robots" content="noindex" />
      <a className={styles.skip} href={`#${mainId}`}>
        {skipLabel}
      </a>

      <aside className={styles.sidebar}>
        <Link className={styles.brand} to={home} aria-label={brandLabel}>
          <Logo className={styles.logo} />
        </Link>
        <ShellNav label={label} items={items} />
        {sidebarFooter && <div className={styles.footer}>{sidebarFooter}</div>}
      </aside>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <Link className={styles.mobileBrand} to={home} aria-label={brandLabel}>
            <Logo className={styles.logo} />
          </Link>
          <div className={styles.actions}>
            {topbarExtra}
            <ThemeToggle />
          </div>
        </header>

        <main id={mainId} className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
