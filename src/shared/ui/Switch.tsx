import { useId, type ReactNode } from 'react'
import styles from './Switch.module.css'

type Props = {
  label: ReactNode
  description?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  /** Work is running: the switch cannot be flipped and says it is busy. It stays focusable, so keyboard focus is not lost. */
  busy?: boolean
  disabled?: boolean
}

/** An on/off setting. A native button with role switch: Space and Enter flip it, like a checkbox. */
export function Switch({ label, description, checked, onChange, busy = false, disabled = false }: Props) {
  const id = useId()
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`
  return (
    <div className={styles.row}>
      <div className={styles.text}>
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        {description && (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        className={styles.switch}
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        disabled={disabled}
        onClick={() => {
          if (!busy) onChange(!checked)
        }}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
    </div>
  )
}
