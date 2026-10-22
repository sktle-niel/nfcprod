import { useDeferredValue, useMemo } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Menu } from '@/entities/menu/menu'
import { MODES } from '@/entities/theme/theme'
import { fill } from '@/shared/lib/fill'
import type { MenuViewBusiness } from '@/shared/menu/MenuView'
import { Button } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { styleName } from './styleWords'
import { styleOf } from './useLookActions'
import { StyleGallery } from './StyleGallery'
import { thumbBusiness, thumbMenu } from './thumbs'
import type { DesignForm } from './useDesignDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.look

type Props = { form: DesignForm; preview: MenuViewBusiness; menu: Menu }

/**
 * The ready-made looks in light or dark, what the chosen one is, and the two ways back: to that style, and to the business
 * type's look.
 */
export function MenuStylePanel({ form, preview, menu }: Props) {
  const { mode } = form.draft.theme
  const id = styleOf(form.draft.theme)
  const { name, tagline, logo, types } = preview
  // The thumbnails follow the name as it is typed, a moment later, so typing never waits on thirteen small menus.
  const business = useDeferredValue(useMemo(() => thumbBusiness({ name, tagline, logo, types }), [name, tagline, logo, types]))
  const short = useMemo(() => thumbMenu(menu, types), [menu, types])

  return (
    <Panel title={text.styles.title}>
      <div className={styles.stack}>
        {/* Light or dark sits with the styles: the thumbnails show each style in the mode chosen here. */}
        <div className={styles.field}>
          <span className={styles.label} aria-hidden="true">
            {text.mode.label}
          </span>
          <SegmentedControl
            label={text.mode.label}
            value={mode}
            onChange={form.setMode}
            options={MODES.map((value) => ({ value, label: text.mode.options[value] }))}
          />
        </div>
        <StyleGallery value={id} mode={mode} business={business} menu={short} onChange={form.applyStyle} />
        <p className={styles.note}>
          <strong className={styles.strong}>{styleName(id)}:</strong> {text.styles.descriptions[id]}
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={form.resetStyle}>
            {fill(text.styles.resetStyle, { style: styleName(id) })}
          </Button>
          <Button variant="secondary" onClick={form.resetLook}>
            {text.reset}
          </Button>
        </div>
        <p role="status" className={styles.note}>
          {form.note}
        </p>
      </div>
    </Panel>
  )
}
