import { useState, type ComponentType } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { BusinessType } from '@/entities/business/business'
import type { Menu } from '@/entities/menu/menu'
import type { MenuViewBusiness } from '@/shared/menu/MenuView'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { ColorsPanel } from './ColorsPanel'
import { ExtrasPanel } from './ExtrasPanel'
import { MenuStylePanel } from './MenuStylePanel'
import { LOOK_PARTS, type LookPart } from './lookParts'
import type { DesignForm } from './useDesignDraft'
import type { DraftErrors } from './validateDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.look

/** What a part gets: the form, and the kinds of business. Only the part that suits its choices to them (the photo library) reads those. */
type PartProps = { form: DesignForm; types?: readonly BusinessType[] | undefined }

const PANELS: Record<LookPart, ComponentType<PartProps>> = {
  colors: ColorsPanel,
  extras: ExtrasPanel,
}

const hasColorError = (errors: DraftErrors) =>
  (['primary', 'secondary', 'background', 'surface', 'theme'] as const).some((field) => errors[field] !== undefined)

type Props = {
  form: DesignForm
  preview: MenuViewBusiness
  menu: Menu
  /** The part shown first. Colors on the page; the developer's page opens another. */
  firstPart?: LookPart
}

/**
 * The second tab: Light or dark and the ready-made templates on top, then the parts of the look that stay the owner's (the colors,
 * and the font, menu layout and page background), one part at a time so the tab stays short. A template draws its own cards,
 * header and titles, so those are not offered. A refused color brings the Colors part back, so the focus can reach the field.
 */
export function LookTab({ form, preview, menu, firstPart = 'colors' }: Props) {
  const [section, setSection] = useState<LookPart>(firstPart)
  const [errors, setErrors] = useState(form.errors)
  // Adjusted while rendering, so the Colors part is on the page before the page looks for the field to focus.
  if (errors !== form.errors) {
    setErrors(form.errors)
    if (hasColorError(form.errors)) setSection('colors')
  }
  const Part = PANELS[section]

  return (
    <div className={styles.stack}>
      <MenuStylePanel form={form} preview={preview} menu={menu} />
      <SegmentedControl
        label={text.sections.label}
        value={section}
        onChange={setSection}
        options={LOOK_PARTS.map((value) => ({ value, label: text.sections.options[value] }))}
      />
      <Part form={form} types={preview.types} />
    </div>
  )
}
