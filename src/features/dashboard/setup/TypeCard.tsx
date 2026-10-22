import { useId } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { BusinessType } from '@/entities/business/business'
import { presetFor } from '@/presets'
import { IconCheck } from '@/shared/ui/icons'
import styles from './TypeCard.module.css'

const text = dashboardCopy.setup

type Props = { type: BusinessType; checked: boolean; onChange: (checked: boolean) => void }

/** One kind of business as a card you tick: what it is, and the categories it starts the menu with. */
export function TypeCard({ type, checked, onChange }: Props) {
  const id = useId()
  const words = text.types[type]
  const categories = presetFor(type).categories.join(', ')

  return (
    <label className={styles.card}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-about ${id}-gets`}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className={styles.face}>
        <span className={styles.tick} aria-hidden="true">
          <IconCheck size={16} />
        </span>
        <span id={`${id}-title`} className={styles.title}>
          {words.label}
        </span>
        <span className={styles.about}>
          <span id={`${id}-about`}>{words.description}</span>
          <span id={`${id}-gets`} className={styles.gets}>
            {text.steps.types.gets.replace('{categories}', categories)}
          </span>
        </span>
      </span>
    </label>
  )
}
