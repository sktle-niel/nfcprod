import { dashboardCopy } from '@/config/dashboardCopy'
import { pictureSrc } from '@/shared/menu/picture'
import { ImagePicker } from '@/shared/ui/ImagePicker'
import type { DesignForm } from './useDesignDraft'

const text = dashboardCopy.design.details.logo

/**
 * The logo picker. A picture is checked and kept as soon as it is chosen; it joins the draft when it has arrived, and the
 * business when the page is saved. The upload belongs to the form (`pickLogo`), so it always joins the newest draft. A logo
 * the page may not show (an address outside the picture storage) is drawn as no logo, like on the menu.
 */
export function LogoField({ form }: { form: DesignForm }) {
  return (
    <ImagePicker
      label={text.label}
      value={pictureSrc(form.draft.logo)}
      alt={text.alt}
      chooseLabel={text.choose}
      replaceLabel={text.replace}
      removeLabel={text.remove}
      emptyLabel={text.empty}
      hint={text.hint}
      busy={form.uploading || form.busy}
      error={form.logoError ?? form.errors.logo}
      onPick={(file) => void form.pickLogo(file)}
      onRemove={form.removeLogo}
    />
  )
}
