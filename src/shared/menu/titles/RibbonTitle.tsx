import styles from './RibbonTitle.module.css'
import type { TitleProps } from './types'

/** "HOT DRINKS ▸": the name on a filled label with a small arrow, then a thin line to the edge. The arrow and the line are drawn shapes. */
export function RibbonTitle({ as: Heading, id, name }: TitleProps) {
  return (
    <Heading id={id} className={styles.title}>
      <span className={styles.label}>{name}</span>
    </Heading>
  )
}
