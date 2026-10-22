import type { ReactNode, Ref } from 'react'
import styles from './Panel.module.css'

type Props = {
  title?: string
  action?: ReactNode
  className?: string | undefined
  ref?: Ref<HTMLElement>
  children: ReactNode
}

/** A white block on the page, the same surface the public site uses for its cards. With a title it gets a header row. */
export function Panel({ title, action, className, ref, children }: Props) {
  return (
    <section ref={ref} className={className ? `${styles.panel} ${className}` : styles.panel}>
      {title && (
        <header className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
