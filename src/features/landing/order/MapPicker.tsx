import { useEffect, useId, useRef, useState } from 'react'
import { copy } from '@/config/copy'
import { geocoder as publicGeocoder, type ReverseGeocoder } from '@/data/geocoder'
import type { LocationRepository } from '@/data/locations'
import type { ResolvedPlaces } from '@/data/resolveAddress'
import styles from './MapPicker.module.css'
import { MapPickerPanel } from './MapPickerPanel'
import { useMapPin } from './useMapPin'

type Props = {
  locations: LocationRepository
  /** Where addresses and searches come from. Left out, the public one. */
  geocoder?: ReverseGeocoder | undefined
  /** Called once for every lookup that ends while it is still the newest pin: with what it matched, or with `{}`. */
  onResolved: (places: ResolvedPlaces) => void
  /** The form's message when the pin is missing or not usable. */
  error?: string | undefined
}

/**
 * The pin on the delivery form. The map opens only when asked, because that is the moment the customer's
 * pin and address start going to the map service. The pin travels as the hidden `lat` and `lng`, and
 * `mapUnavailable` says the map could not work, so that a free outside service never blocks an order.
 */
export function MapPicker({ locations, geocoder = publicGeocoder, onResolved, error }: Props) {
  const text = copy.order.map
  const id = useId()
  const [opened, setOpened] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const map = useMapPin({ geocoder, locations, onResolved })
  const notice = useRef<HTMLParagraphElement>(null)

  // The map went away under a customer who was using it: say why, where they were, instead of dropping them on the page.
  // One way to be heard, not two: the notice is hidden until it has words (see the stylesheet), so a screen reader is not
  // told by a live update but by the focus. A region that was always in the page, with this focus move on top, would read
  // the message out twice. Focus is only taken when it was lost with the panel, never from a field the customer is in.
  useEffect(() => {
    if (unavailable && (!document.activeElement || document.activeElement === document.body)) notice.current?.focus()
  }, [unavailable])

  // The form's message is about a pin that is missing. Once there is one, or once the map cannot work and the order
  // goes without a pin, "pin your spot" would be old news, or would contradict the notice below it.
  const message = unavailable || map.pin ? undefined : error

  const privacyId = `${id}-privacy`
  const errorId = `${id}-error`
  const anchor = { 'data-field': 'pin', 'aria-describedby': message ? `${privacyId} ${errorId}` : privacyId } as const

  return (
    <div role="group" aria-labelledby={`${id}-title`} className={styles.panel} data-invalid={message ? '' : undefined}>
      <h4 id={`${id}-title`} className={styles.title}>
        {text.title}
      </h4>
      <p className={styles.intro}>{text.intro}</p>
      <p id={privacyId} className={styles.privacy}>
        {text.privacy}
      </p>
      {/* Next to the privacy note, above the controls: the form sends focus to the first control, and the message
          must be in view with it. Under the map it was a screen away on a phone. */}
      {message && (
        <p id={errorId} className={styles.error}>
          {message}
        </p>
      )}

      {unavailable ? null : opened ? (
        <MapPickerPanel geocoder={geocoder} map={map} anchor={anchor} onUnavailable={() => setUnavailable(true)} />
      ) : (
        <button type="button" className={`${styles.button} ${styles.primary}`} {...anchor} onClick={() => setOpened(true)}>
          {text.open}
        </button>
      )}

      <p ref={notice} role="status" tabIndex={-1} className={styles.notice}>
        {unavailable ? text.unavailable : ''}
      </p>

      {map.pin && (
        <>
          <input type="hidden" name="lat" value={map.pin.lat.toFixed(5)} />
          <input type="hidden" name="lng" value={map.pin.lng.toFixed(5)} />
        </>
      )}
      {unavailable && <input type="hidden" name="mapUnavailable" value="1" />}
    </div>
  )
}
