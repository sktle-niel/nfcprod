import { dashboardCopy } from '@/config/dashboardCopy'
import { MODES } from '@/entities/theme/theme'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import type { DesignForm } from './useDesignDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.look.mode

/** Light or dark: the one choice that sits above the parts of the look. */
export function ModePanel({ form }: { form: DesignForm }) {
  return (
    <div className={styles.field}>
      <span className={styles.label} aria-hidden="true">
        {text.label}
      </span>
      <SegmentedControl
        label={text.label}
        value={form.draft.theme.mode}
        onChange={form.setMode}
        options={MODES.map((value) => ({ value, label: text.options[value] }))}
      />
    </div>
  )
}
