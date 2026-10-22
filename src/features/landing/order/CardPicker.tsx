import { copy } from '@/config/copy'
import { MAX_QUANTITY, PLATFORMS, type Platform } from '@/entities/order/order'
import { formatPeso } from '@/shared/lib/money'
import { fill } from '@/shared/lib/fill'
import { PlatformIcon } from '../components/PlatformIcon'
import styles from './CardPicker.module.css'
import { chosenPlatforms, clampQuantity, toQuantity, type Quantities } from './quantities'

type Props = {
  /** One card in centavos. */
  price: number
  quantities: Quantities
  onChange: (next: Quantities) => void
  error?: string | undefined
}

/** Amounts set with one tap for every chosen card, for example one card per table. */
const QUICK = [1, 2, 5, 10] as const

/** Selects the whole number, so typing replaces it instead of adding digits to it. */
function selectAll({ currentTarget }: { currentTarget: HTMLInputElement }) {
  currentTarget.setSelectionRange(0, currentTarget.value.length)
}

/** Which cards the customer wants and how many of each. Every chosen platform gets its own quantity. */
export function CardPicker({ price, quantities, onChange, error }: Props) {
  const text = copy.order.cards
  const chosen = chosenPlatforms(quantities)

  function toggle(platform: Platform) {
    const next = { ...quantities }
    if (next[platform] === undefined) next[platform] = '1'
    else delete next[platform]
    onChange(next)
  }

  const setQuantity = (platform: Platform, value: string) => onChange({ ...quantities, [platform]: value })
  const step = (platform: Platform, by: number) =>
    setQuantity(platform, String(clampQuantity(toQuantity(quantities[platform]) + by)))
  const setAll = (value: number) => onChange(Object.fromEntries(chosen.map((platform) => [platform, String(value)])))

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
        <>
          <div className={styles.quick}>
            <span className={styles.quickLabel} aria-hidden="true">
              {text.setAll}
            </span>
            {QUICK.map((value) => (
              <button
                key={value}
                type="button"
                className={styles.quickButton}
                aria-label={text.setAllTo.replace('{n}', String(value))}
                onClick={() => setAll(value)}
              >
                {value}
              </button>
            ))}
          </div>

          <ul className={styles.lines}>
            {chosen.map((platform) => {
              const name = copy.order.cardNames[platform]
              const value = quantities[platform] ?? ''
              const quantity = toQuantity(value)
              return (
                <li key={platform} className={styles.line}>
                  <span className={styles.lineName}>
                    <PlatformIcon platform={platform} className={styles.icon} />
                    <span className={styles.lineText}>
                      {name}
                      <small className={styles.subtotal}>{quantity > 0 ? formatPeso(quantity * price) : ''}</small>
                    </span>
                  </span>
                  <span className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.step}
                      aria-label={fill(text.fewer, { name })}
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
                      aria-label={fill(text.quantity, { name })}
                      value={value}
                      onFocus={selectAll}
                      onClick={selectAll}
                      onChange={(event) => setQuantity(platform, event.target.value.replace(/\D/g, ''))}
                    />
                    <button
                      type="button"
                      className={styles.step}
                      aria-label={fill(text.more, { name })}
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
        </>
      )}

      {error && (
        <p id="cards-error" className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
