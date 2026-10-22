import styles from './StripeTitle.module.css'
import type { TitleProps } from './types'

/** Heavy capitals on a band of the fill color across the whole column, with a few slanted stripes at its end. */
export function StripeTitle({ as: Heading, id, name }: TitleProps) {
  return (
    <Heading id={id} className={styles.title}>
      {name}
    </Heading>
  )
}
