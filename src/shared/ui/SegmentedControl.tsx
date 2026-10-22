import styles from './SegmentedControl.module.css'

type Option<T> = {
  value: T
  label: string
  count?: number
  /** Something on that option needs attention: a dot, and this text for screen readers. */
  alert?: string | undefined
}

type Props<T> = {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  /** Greyed out while the data it filters has not arrived. */
  disabled?: boolean
}

/** A row of toggle buttons where exactly one is on. Used for filters, so it does not move focus or the page. */
export function SegmentedControl<T extends string | number>({ label, value, options, onChange, disabled = false }: Props<T>) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={option.value === value}
          // Spelled out, so the alert is read after the label with a pause between them.
          aria-label={option.alert ? [option.label, option.count, option.alert].filter((part) => part !== undefined).join(', ') : undefined}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
          {option.alert && <span className={styles.alert} />}
        </button>
      ))}
    </div>
  )
}
