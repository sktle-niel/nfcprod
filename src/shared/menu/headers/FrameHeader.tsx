import { HeaderLogo } from './HeaderLogo'
import styles from './FrameHeader.module.css'
import type { HeaderProps } from './types'

/** The name in letter-spaced serif capitals inside a thin double frame, under a small ornament. For fine dining and bars. */
export function FrameHeader({ business, as: Heading }: HeaderProps) {
  return (
    <header className={styles.header}>
      <HeaderLogo logo={business.logo} />
      <svg className={styles.ornament} viewBox="0 0 80 16" aria-hidden="true" focusable="false">
        <path d="M4 8H26M54 8H76" />
        <circle cx="30" cy="8" r="1.6" />
        <circle cx="50" cy="8" r="1.6" />
        <path className={styles.gem} d="M40 1L47 8L40 15L33 8Z" />
      </svg>
      <div className={styles.frame}>
        <Heading className={styles.name}>{business.name}</Heading>
        {business.tagline !== '' && <p className={styles.tagline}>{business.tagline}</p>}
      </div>
    </header>
  )
}
