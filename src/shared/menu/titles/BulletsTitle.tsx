import styles from './BulletsTitle.module.css'
import type { TitleProps } from './types'

/** "• ICED COFFEE •": the name centered in capitals between two dots. The dots are drawn shapes, not characters, so a screen reader reads only the name. */
export function BulletsTitle({ as: Heading, id, name }: TitleProps) {
  return (
    <Heading id={id} className={styles.title}>
      {name}
    </Heading>
  )
}
