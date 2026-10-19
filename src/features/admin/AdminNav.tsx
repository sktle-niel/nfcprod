import { NavLink } from 'react-router-dom'
import { copy } from '@/config/copy'
import styles from './AdminNav.module.css'
import { IconCustomers, IconOrders, IconOverview, IconPricing } from './icons'

const items = [
  { to: '/admin', end: true, label: copy.admin.nav.overview, Icon: IconOverview },
  { to: '/admin/orders', end: false, label: copy.admin.nav.orders, Icon: IconOrders },
  { to: '/admin/customers', end: false, label: copy.admin.nav.customers, Icon: IconCustomers },
  { to: '/admin/pricing', end: false, label: copy.admin.nav.pricing, Icon: IconPricing },
]

/** A sidebar on wide screens and a tab bar at the bottom on phones. */
export function AdminNav() {
  return (
    <nav className={styles.nav} aria-label={copy.admin.menu}>
      <ul className={styles.list}>
        {items.map(({ to, end, label, Icon }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={styles.link ?? ''}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
