import styles from './PlainTitle.module.css'
import type { TitleProps } from './types'

/** The Classic title: a bar in the accent beside the name. */
export function PlainTitle({ as: Heading, id, name }: TitleProps) {
  return (
    <Heading id={id} className={styles.title}>
      {name}
    </Heading>
  )
}
