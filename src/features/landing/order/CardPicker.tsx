import { useState } from 'react'
import { copy } from '@/config/copy'
import { MAX_QUANTITY, PLATFORMS, type Platform } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { plural } from '@/shared/lib/plural'
import { PlatformIcon } from '../components/PlatformIcon'
import { cardPrice } from '../landing.data'
import styles from './CardPicker.module.css'

type Props = { error?: string | undefined }

/** Whole numbers only, so an empty or half-typed field counts as no cards until it is fixed. */
function toQuantity(value: string): number {
  return /^\d+$/.test(value) ? Number(value) : 0
}

/** Which cards the customer wants and how many of each. Every chosen platform gets its own quantity. */
export function CardPicker({ error }: Props) {
  const text = copy.order.cards
  // What the customer typed for each chosen platform. A platform that is not chosen has no entry.
  const [quantities, setQuantities] = useState<Partial<Record<Platform, string>>>({})
  const chosen = PLATFORMS.filter((platform) => quantities[platform] !== undefined)
  const count = chosen.reduce((sum, platform) => sum + toQuantity(quantities[platform] ?? ''), 0)

  function toggle(platform: Platform) {
    setQuantities((current) => {
      const next = { ...current }
      if (next[platform] === undefined) next[platform] = '1'
      else delete next[platform]
      return next
    })
  }

  function setQuantity(platform: Platform, value: string) {
    setQuantities((current) => ({ ...current, [platform]: value }))
  }

  function step(platform: Platform, by: number) {
    const value = toQuantity(quantities[platform] ?? '') + by
    setQuantity(platform, String(Math.min(MAX_QUANTITY, Math.max(1, value))))
  }

  return (
    <fieldset className={styles.fieldset} aria-describedby={error ? 'cards-error' : undefined}>
      <legend className={styles.legend}>{text.legend}</legend>
      <p className={styles.hint}>{text.hint}</p>
      <div className={styles.row}>
        {PLATFORMS.map((platform) => {
          const on = quantities[platform] !== undefined
          return (
            <label key={platform} className={`${styles.chip} ${on ? styles.on : ''}`}>
              <input
                className={styles.control}
                type="checkbox"
                name="platforms"
                value={platform}
                checked={on}
                onChange={() => toggle(platform)}
              />
              <PlatformIcon platform={platform} className={styles.icon} />
              {copy.order.cardNames[platform]}
            </label>
          )
        })}
      </div>

      {chosen.length > 0 && (
        <ul className={styles.lines}>
          {chosen.map((platform) => {
            const name = copy.order.cardNames[platform]
            const value = quantities[platform] ?? ''
            const quantity = toQuantity(value)
            return (
              <li key={platform} className={styles.line}>
                <span className={styles.lineName}>
                  <PlatformIcon platform={platform} className={styles.icon} />
                  {name}
                </span>
                <span className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.step}
                    aria-label={text.fewer.replace('{name}', name)}
                    disabled={quantity <= 1}
                    onClick={() => step(platform, -1)}
                  >
                    −
                  </button>
                  <input
                    className={styles.quantity}
                    name={`quantity-${platform}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={2}
                    aria-label={text.quantity.replace('{name}', name)}
                    value={value}
                    onChange={(event) => setQuantity(platform, event.target.value.replace(/\D/g, ''))}
                  />
                  <button
                    type="button"
                    className={styles.step}
                    aria-label={text.more.replace('{name}', name)}
                    disabled={quantity >= MAX_QUANTITY}
                    onClick={() => step(platform, 1)}
                  >
                    +
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <p className={styles.total} aria-live="polite">
        {count > 0 && `${plural(count, text.count)} · ${formatPeso(count * cardPrice)}`}
      </p>
      {error && (
        <p id="cards-error" className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
