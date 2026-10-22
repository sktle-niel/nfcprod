import { dashboardCopy } from '@/config/dashboardCopy'
import { onPublicOrigin, publicOrigin } from '@/config/publicOrigin'
import { fill } from '@/shared/lib/fill'
import styles from './Share.module.css'

/**
 * Said once, under the menu link, when the dashboard is open on another address than the menu's own. Not a warning: the
 * link, the QR code and the card link are all built from the menu's address (`menuLink`), so they are right as shown.
 */
export function OffAddressNote() {
  if (onPublicOrigin()) return null
  return <p className={styles.note}>{fill(dashboardCopy.share.link.elsewhere, { here: window.location.origin, address: publicOrigin() })}</p>
}
