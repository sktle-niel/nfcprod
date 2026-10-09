import { useId } from 'react'
import { useTheme } from '@/shared/hooks/useTheme'
import styles from './ThemeToggle.module.css'

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315]

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const maskId = useId()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className={styles.button}
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      data-dark={dark}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        toggle({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={styles.icon}>
        <mask id={maskId}>
          <rect width="24" height="24" fill="#fff" />
          <circle className={styles.cut} cx="17" cy="7" r="6" fill="#000" />
        </mask>
        <circle className={styles.body} cx="12" cy="12" r="7.5" fill="currentColor" mask={`url(#${maskId})`} />
        <g className={styles.rays} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {RAYS.map((angle) => (
            <line key={angle} x1="12" y1="2" x2="12" y2="4.2" transform={`rotate(${angle} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  )
}
