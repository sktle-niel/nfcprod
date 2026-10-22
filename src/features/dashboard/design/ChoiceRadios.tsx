import { useId, type CSSProperties, type ReactNode } from 'react'
import styles from './ChoiceRadios.module.css'

type Option<Value extends string> = {
  value: Value
  label: string
  /** A small picture of the choice. It is decoration: the label is the name. */
  sample?: ReactNode
  /** Sets the look of the label itself, for example to write a font's name in that font. */
  labelStyle?: CSSProperties
  /** The sample already shows the name (a title drawn in its own look): the label stays for screen readers only. */
  hideLabel?: boolean
}

type Props<Value extends string> = {
  legend: string
  /** One line under the options that says what the choice changes. */
  hint?: string | undefined
  value: Value
  options: readonly Option<Value>[]
  onChange: (value: Value) => void
  /** Wider cards, for samples that need room (a category title drawn in its real look). */
  wide?: boolean
}

/** A radio group drawn as cards. The inputs stay in the page, so the arrow keys and screen readers work as for any radios. */
export function ChoiceRadios<Value extends string>({ legend, hint, value, options, onChange, wide = false }: Props<Value>) {
  const name = useId()
  return (
    <fieldset className={styles.group} aria-describedby={hint ? `${name}-hint` : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={wide ? `${styles.options} ${styles.wide}` : styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              className={styles.input}
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className={styles.face}>
              {option.sample && (
                <span className={styles.sample} aria-hidden="true">
                  {option.sample}
                </span>
              )}
              <span className={option.hideLabel ? styles.hiddenLabel : styles.label} style={option.labelStyle}>
                {option.label}
              </span>
            </span>
          </label>
        ))}
      </div>
      {hint && (
        <p id={`${name}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </fieldset>
  )
}
