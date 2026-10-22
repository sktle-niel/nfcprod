import { LinkActions } from '../LinkActions'
import styles from './overview.module.css'

/** The public link of a live menu, with Copy and Open. How copying went is announced to screen readers. */
export function MenuLink({ url }: { url: string }) {
  return (
    <div>
      <p className={styles.link}>{url}</p>
      <LinkActions url={url} />
    </div>
  )
}
