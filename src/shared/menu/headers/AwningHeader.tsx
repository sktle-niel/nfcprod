import { HeaderLogo } from './HeaderLogo'
import styles from './AwningHeader.module.css'
import type { HeaderProps } from './types'

/** A shop-front awning across the top (scalloped stripes in the accent and the card color), then the name in big display capitals. */
export function AwningHeader({ business, as: Heading }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.awning} aria-hidden="true" />
      <div className={styles.body}>
        <HeaderLogo logo={business.logo} />
        <Heading className={styles.name}>{business.name}</Heading>
        {business.tagline !== '' && <p className={styles.tagline}>{business.tagline}</p>}
      </div>
    </header>
  )
}
