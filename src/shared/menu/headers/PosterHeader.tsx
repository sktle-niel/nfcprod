import { HeaderLogo } from './HeaderLogo'
import styles from './PosterHeader.module.css'
import { Sparkle } from './Sparkle'
import type { HeaderProps } from './types'

// A word joiner keeps a star on the line of the word it touches; it sits inside the hidden star, so the name reads as typed.
const JOIN = '⁠'

/** The name as a poster: very large display capitals between two sparkle stars (low on the left, high on the right), the tagline under it. */
export function PosterHeader({ business, as: Heading }: HeaderProps) {
  return (
    <header className={styles.header}>
      <HeaderLogo logo={business.logo} />
      <Heading className={styles.name}>
        <span className={styles.starBefore} aria-hidden="true">
          <Sparkle />
          {JOIN}
        </span>
        {business.name}
        <span className={styles.starAfter} aria-hidden="true">
          {JOIN}
          <Sparkle />
        </span>
      </Heading>
      {business.tagline !== '' && <p className={styles.tagline}>{business.tagline}</p>}
    </header>
  )
}
