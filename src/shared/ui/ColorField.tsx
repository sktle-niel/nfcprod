import { useId } from 'react'
import styles from './ColorField.module.css'

type Props = {
  label: string
  /** The accessible name of the color swatch, which is a second control beside the text input. */
  swatchLabel: string
  value: string
  onChange: (value: string) => void
  error?: string | undefined
  hint?: string | undefined
  disabled?: boolean
}

const HEX = /^#[0-9a-f]{6}$/i

/**
 * A color as #rrggbb. The text input hands over exactly what was typed, half-finished or wrong, and the caller validates.
 * The swatch is the browser's color picker and always hands over a valid hex. While the text is not a color, the swatch
 * shows black rather than a stale color.
 */
export function ColorField({ label, swatchLabel, value, onChange, error, hint, disabled = false }: Props) {
  const id = useId()
  const describedBy = [hint && !error ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.row}>
        <input
          id={id}
          type="text"
          className={styles.text}
          value={value}
          maxLength={7}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <input
          type="color"
          className={styles.swatch}
          value={HEX.test(value) ? value.toLowerCase() : '#000000'}
          disabled={disabled}
          aria-label={swatchLabel}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
