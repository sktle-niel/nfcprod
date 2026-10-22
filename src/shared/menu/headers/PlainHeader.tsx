import { HeaderLogo } from './HeaderLogo'
import styles from './PlainHeader.module.css'
import type { HeaderProps } from './types'

/** The Classic header: the logo, the name and the tagline, stacked and centered. */
export function PlainHeader({ business, as: Heading }: HeaderProps) {
  return (
    <header className={styles.header}>
      <HeaderLogo logo={business.logo} />
      <Heading className={styles.name}>{business.name}</Heading>
      {business.tagline !== '' && <p className={styles.tagline}>{business.tagline}</p>}
    </header>
  )
}
