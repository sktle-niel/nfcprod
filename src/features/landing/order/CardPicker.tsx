import { useState } from 'react'
import { copy } from '@/config/copy'
import { BUNDLE_CARD_COUNT, PLATFORMS, type BundleId, type Platform } from '@/entities/order/order'
import { PlatformIcon } from '../components/PlatformIcon'
import styles from './CardPicker.module.css'

type Props = { bundleId: BundleId; error?: string | undefined }

/** Which cards the customer wants: one, any two, or all three, depending on the bundle. */
export function CardPicker({ bundleId, error }: Props) {
  const limit = BUNDLE_CARD_COUNT[bundleId]
  const all = limit === PLATFORMS.length
  const [picked, setPicked] = useState<Platform[]>(all ? [...PLATFORMS] : [])

  function toggle(platform: Platform) {
    setPicked((current) => {
      if (limit === 1) return [platform]
      if (current.includes(platform)) return current.filter((p) => p !== platform)
      return current.length < limit ? [...current, platform] : current
    })
  }

  return (
    <fieldset className={styles.fieldset} aria-describedby={error ? 'cards-error' : undefined}>
      <legend className={styles.legend}>{copy.order.cardsLegend[bundleId]}</legend>
      <div className={styles.row}>
        {PLATFORMS.map((platform) => {
          const on = picked.includes(platform)
          const full = !on && picked.length >= limit
          return all ? (
            <span key={platform} className={`${styles.chip} ${styles.on}`}>
              <input type="hidden" name="platforms" value={platform} />
              <PlatformIcon platform={platform} className={styles.icon} />
              {copy.order.cardNames[platform]}
            </span>
          ) : (
            <label key={platform} className={`${styles.chip} ${on ? styles.on : ''} ${full ? styles.dim : ''}`}>
              <input
                className={styles.control}
                type={limit === 1 ? 'radio' : 'checkbox'}
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
      {error && (
        <p id="cards-error" className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
