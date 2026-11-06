import { useId, useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { BusinessType } from '@/entities/business/business'
import { stockCategoryFor, stockPhoto, stockThumbSrc } from '@/entities/theme/stock'
import { STOCK_CATEGORIES, STOCK_PHOTOS, type StockCategory, type StockId } from '@/entities/theme/stockPhotos'
import { isOneOf } from '@/shared/lib/checks'
import { fill } from '@/shared/lib/fill'
import { Button } from '@/shared/ui/Button'
import { SelectField } from '@/shared/ui/SelectField'
import { PhotoSettings } from './PhotoSettings'
import type { DesignForm } from './useDesignDraft'
import choice from './ChoiceRadios.module.css'
import layout from './Form.module.css'
import styles from './StockPhotoFields.module.css'

const text = dashboardCopy.design.look.backdrop.stock

type OptionProps = { id: StockId; alt: string; name: string; checked: boolean; onChoose: (id: StockId) => void }

/** One photo of the library as a radio. The real input covers the thumbnail, so a tap anywhere on it chooses. */
function PhotoOption({ id, alt, name, checked, onChoose }: OptionProps) {
  const src = stockThumbSrc(id)
  if (src === null) return null
  return (
    <label className={styles.option}>
      <input type="radio" className={styles.input} name={name} value={id} checked={checked} onChange={() => onChoose(id)} />
      <span className={styles.face}>
        {/* The thumbnails are 320 by 240; the size is set so the browser knows their shape before they load. */}
        <img className={styles.image} src={src} alt={alt} width={320} height={240} loading="lazy" decoding="async" />
      </span>
    </label>
  )
}

type Props = {
  form: DesignForm
  /** The kinds of business: they pick the photos that show first. */
  types?: readonly BusinessType[] | undefined
  /** Called once the photo is taken off. The picker leaves with it, so the page decides where the focus goes. */
  onRemoved: () => void
}

/**
 * The photo library as the page background: the kind of business, the photos of that kind, the credit of the chosen one and
 * the way to take it off. Under it the strength, fit and position, as for the owner's own photo. Only choosing a photo
 * changes the theme; looking at another kind does not.
 */
export function StockPhotoFields({ form, types, onRemoved }: Props) {
  const id = useId()
  const chosen = stockPhoto(form.draft.theme.backdropStock)
  // Opens on the kind of the photo already chosen, else on the kind of this business. From then on the owner's pick stands.
  const [category, setCategory] = useState<StockCategory>(() => chosen?.category ?? stockCategoryFor(types))

  const remove = () => {
    form.clearStock()
    onRemoved()
  }

  return (
    <>
      <fieldset className={choice.group} aria-describedby={`${id}-hint`}>
        <legend className={choice.legend}>{text.legend}</legend>
        <div className={layout.stack}>
          <p id={`${id}-hint`} className={layout.note}>
            {text.hint}
          </p>
          <SelectField
            name="stockCategory"
            label={text.categoryLabel}
            placeholder={text.categoryPlaceholder}
            value={category}
            options={STOCK_CATEGORIES.map((value) => ({ value, label: text.categories[value] }))}
            onChange={(value) => {
              // The empty first option is only a prompt: a kind is always open.
              if (isOneOf(STOCK_CATEGORIES, value)) setCategory(value)
            }}
          />
          <div role="radiogroup" aria-label={text.photosLabel} className={styles.grid}>
            {STOCK_PHOTOS.filter((photo) => photo.category === category).map((photo) => (
              <PhotoOption key={photo.id} id={photo.id} alt={photo.alt} name={id} checked={photo.id === chosen?.id} onChoose={form.chooseStock} />
            ))}
          </div>
          {chosen ? (
            <div className={styles.chosen}>
              <p className={layout.note}>{fill(text.chosen, { credit: chosen.credit })}</p>
              <Button variant="ghost" size="sm" onClick={remove}>
                {text.remove}
              </Button>
            </div>
          ) : (
            <p className={layout.note}>{text.none}</p>
          )}
        </div>
      </fieldset>
      <PhotoSettings form={form} />
    </>
  )
}
