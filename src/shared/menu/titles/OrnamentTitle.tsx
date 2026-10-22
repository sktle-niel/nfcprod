import styles from './OrnamentTitle.module.css'
import type { TitleProps } from './types'

/** "——◆ STARTERS ◆——": the name centered in letter-spaced capitals between thin lines that end in small diamonds. */
export function OrnamentTitle({ as: Heading, id, name }: TitleProps) {
  return (
    <Heading id={id} className={styles.title}>
      <span className={styles.name}>{name}</span>
    </Heading>
  )
}
