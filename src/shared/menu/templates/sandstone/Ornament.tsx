import styles from './Ornament.module.css'

/**
 * A swelled rule, the oldest ornament in a printer's case: a line that thickens to the middle, with a lozenge at its center. It
 * closes the masthead and opens the footer. Drawn, not a glyph, so it looks the same in any font the owner picks.
 */
export function Ornament() {
  return (
    <svg className={styles.ornament} viewBox="0 0 160 12" aria-hidden="true" focusable="false">
      <path d="M0 6C24 5.4 48 3.9 70 6 48 8.1 24 6.6 0 6Z" />
      <path d="M160 6C136 5.4 112 3.9 90 6 112 8.1 136 6.6 160 6Z" />
      <path d="M80 1.5 84.5 6 80 10.5 75.5 6Z" />
    </svg>
  )
}

/** The small lozenge at the inner end of the rules beside a category title. */
export function Lozenge() {
  return (
    <svg className={styles.lozenge} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <path d="M4 0 8 4 4 8 0 4Z" />
    </svg>
  )
}
