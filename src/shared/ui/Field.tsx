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
  list?: string
  required?: boolean
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
  list,
  required = true,
}: Props) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')
  const shared = {
    id,
    name,
    maxLength,
    required,
    placeholder,
    autoComplete,
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
        <input {...shared} type={type} inputMode={inputMode} list={list} />
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
