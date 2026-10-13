import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

type Props = {
  title: string
  children?: ReactNode
}

/** The title of a page and, on the right, the one or two things you can do there. */
export function PageHeader({ title, children }: Props) {
  return (
    <header className={styles.head}>
      <h1 className={styles.title}>{title}</h1>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  )
}
