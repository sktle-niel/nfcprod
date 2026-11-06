import { dashboardCopy } from '@/config/dashboardCopy'
import { PHOTO_FITS, PHOTO_POSITIONS, VEILS } from '@/entities/theme/theme'
import { ChoiceRadios } from './ChoiceRadios'
import type { DesignForm } from './useDesignDraft'

const text = dashboardCopy.design.look.backdrop

/** How a page photo is laid, whatever it is: its strength under the veil, its fit and its position. The owner's photo and a library photo share them. */
export function PhotoSettings({ form }: { form: DesignForm }) {
  const { theme } = form.draft

  return (
    <>
      <ChoiceRadios
        legend={text.veil.legend}
        hint={text.veil.hint}
        value={theme.backdropVeil}
        onChange={(veil) => form.setChoice('backdropVeil', veil)}
        options={VEILS.map((veil) => ({ value: veil, label: text.veil.options[veil] }))}
      />
      <ChoiceRadios
        legend={text.fit.legend}
        hint={text.fit.hint}
        value={theme.backdropFit}
        onChange={(fit) => form.setChoice('backdropFit', fit)}
        options={PHOTO_FITS.map((fit) => ({ value: fit, label: text.fit.options[fit] }))}
      />
      <ChoiceRadios
        legend={text.position.legend}
        hint={text.position.hint}
        value={theme.backdropPosition}
        onChange={(position) => form.setChoice('backdropPosition', position)}
        options={PHOTO_POSITIONS.map((position) => ({ value: position, label: text.position.options[position] }))}
      />
    </>
  )
}
