import { useId } from 'react'
import styles from './Field.module.css'

export type SelectOption = { value: string; label: string }

type Props = {
  /** Lets the form find this field again, to focus the first one with a problem. */
  name: string
  label: string
  value: string
  options: readonly SelectOption[]
  /** The empty first option: what the field says while nothing is chosen. */
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
  /** The options are on their way. */
  busy?: boolean
  error?: string | undefined
  hint?: string | undefined
}

/** The same label, hint and error as `Field`, around a native select: the phone shows its own picker. */
export function SelectField({
  name,
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  busy = false,
  error,
  hint,
}: Props) {
  const id = useId()
  const describedBy = [hint && !error ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <select
          id={id}
          data-field={name}
          className={`${styles.input} ${styles.select}`}
          value={value}
          required
          disabled={disabled}
          aria-busy={busy || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
