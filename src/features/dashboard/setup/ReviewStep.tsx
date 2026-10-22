import { useId } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { BusinessType } from '@/entities/business/business'
import { mergePresets } from '@/presets'
import { plural } from '@/shared/lib/plural'
import { Button } from '@/shared/ui/Button'
import { ownerErrorText } from '../ownerErrors'
import styles from './ReviewStep.module.css'
import type { Step } from './useSetupWizard'

const text = dashboardCopy.setup
const review = text.steps.review

type Props = {
  name: string
  types: readonly BusinessType[]
  slug: string
  samples: boolean
  failure: unknown
  onSamples: (samples: boolean) => void
  onChange: (step: Step) => void
}

/** What the owner is about to create, with a way back to each answer, and the example items choice. */
export function ReviewStep({ name, types, slug, samples, failure, onSamples, onChange }: Props) {
  const rows: { step: Step; term: string; value: string; change: string }[] = [
    { step: 1, term: review.name, value: name.trim(), change: review.changeNames.name },
    { step: 2, term: review.types, value: types.map((type) => text.types[type].label).join(', '), change: review.changeNames.types },
    { step: 3, term: review.link, value: `/m/${slug}`, change: review.changeNames.link },
  ]
  const sampleCount = mergePresets(types).samples.length
  const id = useId()

  return (
    <div className={styles.step}>
      <dl className={styles.rows}>
        {rows.map((row) => (
          <div key={row.step} className={styles.row}>
            <dt className={styles.term}>{row.term}</dt>
            <dd className={styles.value}>{row.value}</dd>
            <Button variant="ghost" size="sm" aria-label={row.change} onClick={() => onChange(row.step)}>
              {review.change}
            </Button>
          </div>
        ))}
      </dl>
      <label className={styles.samples}>
        <input
          type="checkbox"
          checked={samples}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-hint`}
          onChange={(event) => onSamples(event.currentTarget.checked)}
        />
        <span className={styles.samplesText}>
          <span id={`${id}-label`} className={styles.samplesLabel}>
            {review.samples.label}
          </span>
          <span id={`${id}-hint`} className={styles.samplesHint}>{plural(sampleCount, review.samples.hint)}</span>
        </span>
      </label>
      {failure !== null && (
        <p role="alert" className={styles.failure}>
          {ownerErrorText(failure)}
        </p>
      )}
    </div>
  )
}
