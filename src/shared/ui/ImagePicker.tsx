import { useEffect, useId, useRef, type ChangeEvent } from 'react'
import { Button } from './Button'
import styles from './ImagePicker.module.css'

type Props = {
  label: string
  /** The address of the current picture, or null for none. */
  value: string | null
  /** Describes the current picture for screen readers. */
  alt: string
  onPick: (file: File) => void
  onRemove: () => void
  chooseLabel: string
  replaceLabel: string
  removeLabel: string
  /** The words in the quiet box shown while there is no picture. */
  emptyLabel: string
  busy?: boolean
  error?: string | undefined
  hint?: string | undefined
}

/**
 * Shows a picture and lets the person choose or remove one. It checks nothing about the file: the caller validates the type,
 * the size and the first bytes before it keeps the picture.
 */
export function ImagePicker({
  label,
  value,
  alt,
  onPick,
  onRemove,
  chooseLabel,
  replaceLabel,
  removeLabel,
  emptyLabel,
  busy = false,
  error,
  hint,
}: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const choose = useRef<HTMLButtonElement>(null)
  const wasBusy = useRef(false)
  const describedBy = [hint && !error ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ')

  const picked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    // Cleared so that choosing the same file again (after a refusal, say) still fires a change.
    event.currentTarget.value = ''
    if (file) onPick(file)
  }

  // A disabled button loses focus in the browser, so when the work ends and focus fell to the page, it goes back to Choose.
  useEffect(() => {
    if (wasBusy.current && !busy && document.activeElement === document.body) choose.current?.focus()
    wasBusy.current = busy
  }, [busy])

  // Remove takes itself out of the page, so focus moves to the button that is always there.
  const remove = () => {
    choose.current?.focus()
    onRemove()
  }

  return (
    <div
      className={styles.picker}
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={describedBy || undefined}
      // While there is a refusal the group can take focus, so a form can send focus here when a save is refused.
      tabIndex={error ? -1 : undefined}
      data-invalid={error ? 'true' : undefined}
    >
      <span id={`${id}-label`} className={styles.label}>
        {label}
      </span>
      <div className={styles.preview}>
        {value ? <img src={value} alt={alt} className={styles.image} /> : <span className={styles.empty}>{emptyLabel}</span>}
      </div>
      <div className={styles.actions}>
        <Button ref={choose} variant="secondary" size="sm" busy={busy} onClick={() => input.current?.click()}>
          {value ? replaceLabel : chooseLabel}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
            {removeLabel}
          </Button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.file}
        tabIndex={-1}
        aria-hidden="true"
        onChange={picked}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
