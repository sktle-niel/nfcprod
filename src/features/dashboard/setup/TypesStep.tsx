import { dashboardCopy } from '@/config/dashboardCopy'
import { BUSINESS_TYPES, type BusinessType } from '@/entities/business/business'
import ui from '@/shared/ui/ui.module.css'
import styles from './steps.module.css'
import { TypeCard } from './TypeCard'

const text = dashboardCopy.setup.steps.types

type Props = { types: readonly BusinessType[]; error: string | undefined; onToggle: (type: BusinessType, on: boolean) => void }

export function TypesStep({ types, error, onToggle }: Props) {
  return (
    <fieldset className={styles.group} aria-describedby={error ? 'setup-types-error' : undefined}>
      <legend className={ui.visuallyHidden}>{text.legend}</legend>
      <div className={styles.cards}>
        {BUSINESS_TYPES.map((type) => (
          <TypeCard key={type} type={type} checked={types.includes(type)} onChange={(on) => onToggle(type, on)} />
        ))}
      </div>
      {error && (
        <p id="setup-types-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
