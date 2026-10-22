import { dashboardCopy } from '@/config/dashboardCopy'
import { toCssVars } from '@/entities/theme/cssVars'
import { ColorField } from '@/shared/ui/ColorField'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import type { DesignForm } from './useDesignDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.look.surface

type Choice = 'auto' | 'custom'

/**
 * The card color: automatic (null, picked to suit the page) or the owner's own. Choosing "My own color" starts from the
 * automatic color, so nothing jumps; the text on cards is always picked to read on it.
 */
export function SurfaceField({ form }: { form: DesignForm }) {
  const { theme } = form.draft
  const choice: Choice = theme.surface === null ? 'auto' : 'custom'

  const choose = (next: Choice) => {
    if (next === choice) return
    form.setSurface(next === 'auto' ? null : (toCssVars(theme)['--menu-surface'] ?? null))
  }

  return (
    <div className={styles.field}>
      <span className={styles.label} aria-hidden="true">
        {text.legend}
      </span>
      <SegmentedControl
        label={text.legend}
        value={choice}
        onChange={choose}
        options={[
          { value: 'auto', label: text.options.auto },
          { value: 'custom', label: text.options.custom },
        ]}
      />
      {theme.surface === null ? (
        <p className={styles.note}>{text.hint}</p>
      ) : (
        <ColorField
          label={text.label}
          swatchLabel={text.swatch}
          value={theme.surface}
          error={form.errors.surface}
          onChange={form.setSurface}
        />
      )}
    </div>
  )
}
