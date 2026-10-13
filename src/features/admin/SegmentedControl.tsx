import styles from './SegmentedControl.module.css'

type Option<T> = {
  value: T
  label: string
  count?: number
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
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className={styles.count}>{option.count}</span>}
        </button>
      ))}
    </div>
  )
}
