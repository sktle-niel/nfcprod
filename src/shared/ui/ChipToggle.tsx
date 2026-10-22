import type { ReactNode } from 'react'
import styles from './ChipToggle.module.css'

type ChipToggleProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

/** A checkbox drawn as a chip. The input stays in the page and keeps the keyboard and screen reader behavior. */
export function ChipToggle({ label, checked, onChange, disabled = false }: ChipToggleProps) {
  return (
    <label className={styles.chip}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className={styles.face}>{label}</span>
    </label>
  )
}

type ChipGroupProps = { legend: string; hint?: string | undefined; children: ReactNode }

/** A set of chips under one legend. */
export function ChipGroup({ legend, hint, children }: ChipGroupProps) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      {hint && <p className={styles.hint}>{hint}</p>}
      <div className={styles.chips}>{children}</div>
    </fieldset>
  )
}
