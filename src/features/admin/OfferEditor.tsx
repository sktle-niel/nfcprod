import { copy } from '@/config/copy'
import {
  DISCOUNT_MAX,
  parsePercent,
  parsePesos,
  salePrice,
  type FieldError,
  type OfferErrors,
  type OfferKey,
} from '@/entities/pricing/pricing'
import { formatPeso } from '@/shared/lib/money'
import { Panel } from './Panel'
import { PerkList } from './PerkList'
import styles from './PricingPage.module.css'
import ui from './ui.module.css'
import type { OfferValues } from './usePricingEditor'

const text = copy.admin.pricing

export type OfferActions = {
  setPrice: (key: OfferKey, value: string) => void
  setDiscount: (key: OfferKey, value: string) => void
  setPerk: (key: OfferKey, id: number, value: string) => void
  addPerk: (key: OfferKey) => void
  removePerk: (key: OfferKey, id: number) => void
}

type Props = {
  offer: OfferKey
  values: OfferValues
  errors: OfferErrors | undefined
  actions: OfferActions
  /** Shown under the price instead of the usual hint, for example what a year saves. */
  priceNote?: string | null | undefined
}

function priceError(code: FieldError): string {
  if (code === 'required' || code === 'invalid' || code === 'range' || code === 'yearTooHigh') return text.errors[code]
  return text.errors.invalid
}

function discountError(code: FieldError): string {
  return code === 'range' ? text.errors.discountRange.replace('{max}', String(DISCOUNT_MAX)) : text.errors.discountInvalid
}

/** "Customers pay ₱303, 20% off ₱379." while the price and the discount make sense. */
function paysNote(values: OfferValues): string | null {
  const price = parsePesos(values.price)
  const discount = parsePercent(values.discount)
  if (price === null || discount === null || discount <= 0 || discount > DISCOUNT_MAX) return null
  return text.pays
    .replace('{sale}', formatPeso(salePrice({ price, discount })))
    .replace('{percent}', String(discount))
    .replace('{price}', formatPeso(price))
}

type AffixProps = {
  name: string
  label: string
  value: string
  affix: { side: 'before' | 'after'; text: string }
  maxLength: number
  error: string | null
  note: string
  onChange: (value: string) => void
}

/** A short number input with ₱ before it or % after it, and one line under it: the error, or else the note. */
function AffixField({ name, label, value, affix, maxLength, error, note, onChange }: AffixProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <div className={styles.control} data-affix={affix.side}>
        <span className={styles.affix} aria-hidden="true">
          {affix.text}
        </span>
        <input
          id={name}
          name={name}
          className={`${ui.field} ${styles.input}`}
          inputMode="numeric"
          autoComplete="off"
          maxLength={maxLength}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${name}-note`}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      <p id={`${name}-note`} className={error ? styles.error : styles.hint}>
        {error ?? note}
      </p>
    </div>
  )
}

/** Price, discount and included items of one offer. */
export function OfferEditor({ offer, values, errors, actions, priceNote }: Props) {
  const title = text.offers[offer]
  return (
    <Panel title={title.title} className={styles.panel}>
      <div className={styles.editor}>
        <div className={styles.numbers}>
          <AffixField
            name={`${offer}-price`}
            label={text.price}
            value={values.price}
            affix={{ side: 'before', text: '₱' }}
            maxLength={9}
            error={errors?.price ? priceError(errors.price) : null}
            note={priceNote ?? title.hint}
            onChange={(value) => actions.setPrice(offer, value)}
          />
          <AffixField
            name={`${offer}-discount`}
            label={text.discount}
            value={values.discount}
            affix={{ side: 'after', text: '%' }}
            maxLength={3}
            error={errors?.discount ? discountError(errors.discount) : null}
            note={paysNote(values) ?? text.discountHint.replace('{max}', String(DISCOUNT_MAX))}
            onChange={(value) => actions.setDiscount(offer, value)}
          />
        </div>
        <PerkList
          offer={offer}
          perks={values.perks}
          errors={errors?.perks}
          tooMany={errors?.list === 'tooMany'}
          onChange={(id, value) => actions.setPerk(offer, id, value)}
          onAdd={() => actions.addPerk(offer)}
          onRemove={(id) => actions.removePerk(offer, id)}
        />
      </div>
    </Panel>
  )
}
