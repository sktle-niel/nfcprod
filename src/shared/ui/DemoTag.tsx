import type { ReactNode } from 'react'
import styles from './DemoTag.module.css'

/** A small pill in the top strip that says the data on the page is not real yet. */
export function DemoTag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>
}
