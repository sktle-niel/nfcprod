import { useId, type ReactNode } from 'react'
import styles from './Field.module.css'

type Props = {
  name: string
  label: string
  error?: string | undefined
  hint?: string | undefined
  multiline?: boolean
  type?: 'text' | 'tel' | 'email' | 'password'
  inputMode?: 'text' | 'tel' | 'email'
  autoComplete?: string
  placeholder?: string
  maxLength: number
  required?: boolean
  /** Sits inside the right end of the input, for example a show-password button. */
  trailing?: ReactNode
  /** Typed exactly: no capital first letter, no spell check. On by default for email and password. */
  exact?: boolean
}

/** Label, input (or textarea) and error text wired together for screen readers. */
export function Field({
  name,
  label,
  error,
  hint,
  multiline = false,
  type = 'text',
  inputMode,
  autoComplete,
  placeholder,
  maxLength,
  required = true,
  trailing,
  exact = type === 'email' || type === 'password',
}: Props) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')
  const shared = {
    id,
    name,
    'data-field': name,
    maxLength,
    required,
    placeholder,
    autoComplete,
    className: trailing ? `${styles.input} ${styles.withTrailing}` : styles.input,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  }
  const typing = exact ? { autoCapitalize: 'none', spellCheck: false } : {}
  const input = <input {...shared} {...typing} type={type} inputMode={inputMode} list={list} />

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} />
      ) : trailing ? (
        <div className={styles.control}>
          {input}
          <span className={styles.trailing}>{trailing}</span>
        </div>
      ) : (
        input
      )}
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
