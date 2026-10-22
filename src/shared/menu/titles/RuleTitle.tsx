import styles from './RuleTitle.module.css'
import type { TitleProps } from './types'

/** Heavy capitals on a thick rule in the accent, with a thin one under it. The rule is a drawn shape. */
export function RuleTitle({ as: Heading, id, name }: TitleProps) {
  return (
    <Heading id={id} className={styles.title}>
      {name}
    </Heading>
  )
}
