import styles from './SwelledRule.module.css'

/** The sign painter's rule: one pull of a fine brush, thin at both ends and full in the middle. It decorates, so readers skip it. */
export function SwelledRule({ className }: { className?: string | undefined }) {
  return (
    <svg className={`${styles.rule} ${className ?? ''}`.trim()} viewBox="0 0 300 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 4C70 3.6 118 1.2 150 .6 182 1.2 230 3.6 300 4 230 4.4 182 6.8 150 7.4 118 6.8 70 4.4 0 4Z" />
    </svg>
  )
}
