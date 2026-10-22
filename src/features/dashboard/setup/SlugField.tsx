import { useId, useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { SLUG_MAX } from '@/entities/business/slug'
import { Button } from '@/shared/ui/Button'
import styles from './SlugField.module.css'
import type { SlugState } from './useSlugStatus'

const text = dashboardCopy.setup.steps.link

type Props = {
  slug: string
  state: SlugState
  /** Words from a refusal at creation. They stand in for the lookup's words until the owner edits the link. */
  refusal: string | undefined
  onChange: (slug: string) => void
  onRecheck: () => void
}

/** The tone of each state: good, still waiting, or a problem to fix. */
const TONE: Record<SlugState, 'good' | 'wait' | 'bad'> = {
  available: 'good',
  checking: 'wait',
  empty: 'bad',
  invalid: 'bad',
  reserved: 'bad',
  taken: 'bad',
  failed: 'bad',
}

/** The link name with its fixed "/m/" start, and one live line that says where the link stands. */
export function SlugField({ slug, state, refusal, onChange, onRecheck }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const tone = refusal ? 'bad' : TONE[state]

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {text.label}
      </label>
      <div className={styles.control} data-tone={tone}>
        <span className={styles.prefix} aria-hidden="true">
          /m/
        </span>
        <input
          ref={input}
          id={id}
          name="slug"
          className={styles.input}
          value={slug}
          maxLength={SLUG_MAX}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={tone === 'bad' || undefined}
          aria-describedby={`${id}-status`}
          onChange={(event) => onChange(event.currentTarget.value.toLowerCase().replace(/\s+/g, '-'))}
        />
      </div>
      <div className={styles.status}>
        <p id={`${id}-status`} role="status" className={styles.message} data-tone={tone}>
          {refusal ?? text.status[state]}
        </p>
        {state === 'failed' && !refusal && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onRecheck()
              // The button is gone as soon as the check starts again, so the focus goes to the field it belongs to.
              input.current?.focus()
            }}
          >
            {text.recheck}
          </Button>
        )}
      </div>
    </div>
  )
}
