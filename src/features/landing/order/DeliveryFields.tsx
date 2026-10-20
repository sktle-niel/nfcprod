import { useCallback, useRef } from 'react'
import { copy } from '@/config/copy'
import type { ReverseGeocoder } from '@/data/geocoder'
import type { LocationRepository } from '@/data/locations'
import type { ResolvedPlaces } from '@/data/resolveAddress'
import type { FieldName } from '@/entities/order/validate'
import { Field } from '@/shared/ui/Field'
import styles from './DeliveryFields.module.css'
import { MapPicker } from './MapPicker'
import { PlaceFields } from './PlaceFields'
import { usePlacePicker } from './usePlacePicker'

type Props = {
  locations: LocationRepository
  /** Where the map panel looks up addresses. Left out, it uses the public one. */
  geocoder?: ReverseGeocoder | undefined
  /** The error text the form shows for a field, if it has one. */
  message: (field: FieldName) => string | undefined
}

/**
 * Where to deliver. The map comes first: the pin fills the three place fields and, when it is empty, the street.
 * Everything it fills can be changed by the customer, and nothing the customer typed is ever replaced.
 */
export function DeliveryFields({ locations, geocoder, message }: Props) {
  const { fields } = copy.order
  const picker = usePlacePicker(locations)
  const { fill } = picker
  const root = useRef<HTMLDivElement>(null)
  // The street the map put in the box last. A box that still holds it has not been touched by the customer.
  const suggested = useRef('')

  const onResolved = useCallback(
    (places: ResolvedPlaces) => {
      fill(places)

      // The street box belongs to the shared Field, which keeps its text itself, so it is read and set on the element.
      const street = root.current?.querySelector<HTMLInputElement>('input[data-field="street"]')
      if (!street || (street.value !== '' && street.value !== suggested.current)) return
      // A new pin with no street clears the old suggestion: a street for another spot is worse than none.
      suggested.current = places.street ?? ''
      street.value = suggested.current
    },
    [fill],
  )

  return (
    <div ref={root} className={styles.section}>
      <h3 className={styles.heading}>{copy.order.deliveryTitle}</h3>
      <MapPicker locations={locations} geocoder={geocoder} onResolved={onResolved} error={message('pin')} />
      <PlaceFields picker={picker} errors={{ province: message('province'), city: message('city'), barangay: message('barangay') }}>
        <Field name="street" label={fields.street.label} placeholder={fields.street.placeholder} autoComplete="address-line1" maxLength={120} error={message('street')} />
      </PlaceFields>
      <Field name="landmark" multiline label={fields.landmark.label} placeholder={fields.landmark.placeholder} hint={fields.landmark.hint} autoComplete="off" maxLength={200} error={message('landmark')} />
    </div>
  )
}
