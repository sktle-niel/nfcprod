import { dashboardCopy } from '@/config/dashboardCopy'
import { pictureSrc } from '@/shared/menu/picture'
import { ImagePicker } from '@/shared/ui/ImagePicker'
import { PhotoSettings } from './PhotoSettings'
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
      <PhotoSettings form={form} />
    </>
  )
}
