import { dashboardCopy } from '@/config/dashboardCopy'
import { PHOTO_FITS, PHOTO_POSITIONS, VEILS } from '@/entities/theme/theme'
import { pictureSrc } from '@/shared/menu/picture'
import { ImagePicker } from '@/shared/ui/ImagePicker'
import { ChoiceRadios } from './ChoiceRadios'
import type { DesignForm } from './useDesignDraft'

const text = dashboardCopy.design.look.backdrop

/** The owner's page photo and how it is laid: the picture, its strength under the veil, its fit and its position. Shown under "Your photo". */
export function PagePhotoFields({ form }: { form: DesignForm }) {
  const { theme } = form.draft

  return (
    <>
      <ImagePicker
        label={text.picture.label}
        value={pictureSrc(theme.backdropPicture)}
        alt={text.picture.alt}
        chooseLabel={text.picture.choose}
        replaceLabel={text.picture.replace}
        removeLabel={text.picture.remove}
        emptyLabel={text.picture.empty}
        hint={text.picture.hint}
        busy={form.uploading || form.busy}
        error={form.backdropPictureError}
        onPick={(file) => void form.pickBackdropPicture(file)}
        onRemove={form.removeBackdropPicture}
      />
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
