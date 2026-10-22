import type { ReactNode } from 'react'
import styles from './Chip.module.css'

/** A small outlined label next to a title ("Live", "Your plan"). The warn tone is for something that needs attention. */
export function Chip({ children, tone }: { children: ReactNode; tone?: 'warn' | undefined }) {
  return (
    <span className={styles.chip} data-tone={tone}>
      {children}
    </span>
  )
}
