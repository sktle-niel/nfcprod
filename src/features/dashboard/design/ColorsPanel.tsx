import { useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { COLOR_KEYS, type ColorKey } from './draft'
import { ColorField } from '@/shared/ui/ColorField'
import { Panel } from '@/shared/ui/Panel'
import { SurfaceField } from './SurfaceField'
import { ThemeWarnings } from './ThemeWarnings'
import type { DesignForm } from './useDesignDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.look

const LABELS: Record<ColorKey, string> = { primary: text.primary, secondary: text.secondary, background: text.background }

/** The accent, text and page colors and the card color, with warnings under them about hard-to-read pairs. */
export function ColorsPanel({ form }: { form: DesignForm }) {
  const { draft, errors } = form
  const fields = useRef<HTMLDivElement>(null)

  const fix = ({ key, color }: { key: ColorKey; color: string }) => {
    form.setColor(key, color)
    // The Fix button is gone once the problem is, so the focus goes to the color it changed.
    fields.current?.querySelectorAll<HTMLInputElement>('input[type="text"]')[COLOR_KEYS.indexOf(key)]?.focus()
  }

  return (
    <Panel title={text.colorsTitle}>
      <div className={styles.stack}>
        {errors.theme && (
          <p role="alert" className={styles.error}>
            {errors.theme}
          </p>
        )}
        <div ref={fields} className={styles.stack}>
          {COLOR_KEYS.map((key) => (
            <ColorField
              key={key}
              label={LABELS[key]}
              swatchLabel={text.swatch[key]}
              hint={key === 'primary' ? text.primaryHint : undefined}
              value={draft.theme[key]}
              error={errors[key]}
              onChange={(value) => form.setColor(key, value)}
            />
          ))}
        </div>
        <SurfaceField form={form} />
        <ThemeWarnings theme={draft.theme} onFix={fix} />
      </div>
    </Panel>
  )
}
