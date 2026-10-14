import { useId } from 'react'
import styles from './Field.module.css'

type Props = {
  name: string
  label: string
  error?: string | undefined
  hint?: string | undefined
  multiline?: boolean
  type?: 'text' | 'tel'
  inputMode?: 'text' | 'tel'
  autoComplete?: string
  placeholder?: string
  maxLength: number
  required?: boolean
  /** Fills the field when it first shows. The field stays uncontrolled. */
  defaultValue?: string | undefined
}

/** Label, input (or textarea) and error text wired together for screen readers. */
export function Field({
  name,
  label,
  error,
  hint,
  multiline = false,
  type = 'text',
  inputMode = 'text',
  autoComplete,
  placeholder,
  maxLength,
  required = true,
  defaultValue,
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
    defaultValue,
    className: styles.input,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} />
      ) : (
        <input {...shared} type={type} inputMode={inputMode} />
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
