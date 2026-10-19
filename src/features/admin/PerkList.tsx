import { copy } from '@/config/copy'
import { PERK_MAX, PERKS_MAX, type FieldError, type OfferKey } from '@/entities/pricing/pricing'
import styles from './PricingPage.module.css'
import ui from './ui.module.css'
import type { PerkValue } from './usePricingEditor'

const text = copy.admin.pricing

type Props = {
  offer: OfferKey
  perks: readonly PerkValue[]
  errors: readonly (FieldError | null)[] | undefined
  tooMany: boolean
  onChange: (id: number, value: string) => void
  onAdd: () => void
  onRemove: (id: number) => void
}

function perkError(code: FieldError): string {
  const errors = text.errors
  if (code === 'tooShort') return errors.perkShort
  if (code === 'tooLong') return errors.perkLong.replace('{max}', String(PERK_MAX))
  if (code === 'invalid') return errors.perkInvalid
  return errors.perkRequired
}

/** The items a card lists with check marks: one input per item, with Remove, and Add at the end. */
export function PerkList({ offer, perks, errors, tooMany, onChange, onAdd, onRemove }: Props) {
  const legendId = `${offer}-perks`
  return (
    <fieldset className={styles.perks} aria-labelledby={legendId}>
      <legend id={legendId} className={styles.label}>
        {text.included}
      </legend>
      <p className={styles.hint}>{text.includedHint.replace('{max}', String(PERKS_MAX))}</p>
      {perks.length === 0 && <p className={styles.hint}>{text.noPerks}</p>}
      <ol className={styles.perkList}>
        {perks.map((perk, index) => {
          const n = String(index + 1)
          const error = errors?.[index] ?? null
          const id = `${offer}-perk-${perk.id}`
          return (
            <li key={perk.id} className={styles.perkRow}>
              <input
                id={id}
                name={id}
                className={ui.field}
                aria-label={text.perk.replace('{n}', n)}
                placeholder={text.perkPlaceholder}
                maxLength={PERK_MAX + 20}
                value={perk.text}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(event) => onChange(perk.id, event.target.value)}
              />
              <button
                type="button"
                className={styles.remove}
                aria-label={text.removePerk.replace('{n}', n)}
                onClick={() => onRemove(perk.id)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </button>
              {error && (
                <p id={`${id}-error`} className={styles.error}>
                  {perkError(error)}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      {tooMany && <p className={styles.error}>{text.errors.tooMany.replace('{max}', String(PERKS_MAX))}</p>}
      <button type="button" className={styles.secondary} disabled={perks.length >= PERKS_MAX} onClick={onAdd}>
        {text.addPerk}
      </button>
    </fieldset>
  )
}
