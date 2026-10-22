import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

type Props = {
  title: string
  /** A line under the title: what the page is about, such as the name of the business. */
  subtitle?: string
  children?: ReactNode
}

/** The title of a page and, on the right, the one or two things you can do there. */
export function PageHeader({ title, subtitle, children }: Props) {
  return (
    <header className={styles.head}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle !== undefined && subtitle !== '' && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  )
}
