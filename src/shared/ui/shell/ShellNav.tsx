import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './ShellNav.module.css'

export type ShellNavItem = {
  to: string
  /** Match the exact path only, for the item that is the parent of the others. */
  end?: boolean
  label: string
  Icon: ComponentType<{ size?: number }>
}

type Props = {
  label: string
  items: readonly ShellNavItem[]
}

/** A sidebar on wide screens and a tab bar at the bottom on phones. */
export function ShellNav({ label, items }: Props) {
  return (
    <nav className={styles.nav} aria-label={label}>
      {/* Five or more tabs share the row on a phone (see the stylesheet). Four keep their fixed width. */}
      <ul className={styles.list} data-dense={items.length > 4 || undefined}>
        {items.map(({ to, end = false, label: text, Icon }) => (
          <li key={to} className={styles.item}>
            <NavLink to={to} end={end} className={styles.link ?? ''}>
              <Icon />
              <span>{text}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
