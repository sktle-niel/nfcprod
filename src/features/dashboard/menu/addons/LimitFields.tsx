import { useId } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import fieldStyles from '@/shared/ui/Field.module.css'
import ui from '@/shared/ui/ui.module.css'
import styles from './GroupEditor.module.css'
import { withMin, type GroupDraft, type GroupMessages } from './groupForm'

const text = dashboardCopy.addons.editor

type BoxProps = { name: 'min' | 'max'; label: string; value: string; error: string | undefined; onChange: (value: string) => void }

function NumberBox({ name, label, value, error, onChange }: BoxProps) {
  const id = useId()
  return (
    <div className={fieldStyles['field']}>
      <label htmlFor={id} className={fieldStyles['label']}>
        {label}
      </label>
      <input
        id={id}
        data-field={name}
        className={ui['field']}
        value={value}
        inputMode="numeric"
        maxLength={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className={fieldStyles['error']}>
          {error}
        </p>
      )}
    </div>
  )
}

type Props = { draft: GroupDraft; messages: GroupMessages; onChange: (draft: GroupDraft) => void }

/** The fewest and the most a customer can pick. The fewest is tied to the "required" switch by `withMin`. */
export function LimitFields({ draft, messages, onChange }: Props) {
  return (
    <div className={styles.limits}>
      <NumberBox name="min" label={text.min} value={draft.min} error={messages.min} onChange={(min) => onChange(withMin(draft, min))} />
      <NumberBox name="max" label={text.max} value={draft.max} error={messages.max} onChange={(max) => onChange({ ...draft, max })} />
    </div>
  )
}
