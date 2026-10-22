import { HeaderLogo } from './HeaderLogo'
import styles from './ScriptHeader.module.css'
import type { HeaderProps } from './types'

/** The logo, the name written in the script font over a small brush swash, and the tagline in small capitals. */
export function ScriptHeader({ business, as: Heading }: HeaderProps) {
  return (
    <header className={styles.header}>
      <HeaderLogo logo={business.logo} />
      <Heading className={styles.name}>{business.name}</Heading>
      <svg className={styles.swash} viewBox="0 0 120 14" aria-hidden="true" focusable="false">
        <path d="M3 10C24 4 46 3 66 6C84 9 100 10 117 4" />
      </svg>
      {business.tagline !== '' && <p className={styles.tagline}>{business.tagline}</p>}
    </header>
  )
}
