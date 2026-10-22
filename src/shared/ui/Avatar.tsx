import { initials } from '@/shared/lib/format'
import styles from './Avatar.module.css'

/** The initials of a person in a circle. The name is always written next to it, so it is hidden from screen readers. */
export function Avatar({ name }: { name: string }) {
  return (
    <span className={styles.avatar} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
