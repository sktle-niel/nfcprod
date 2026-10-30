import { useRef, useState, type FormEvent } from 'react'
import { copy } from '@/config/copy'
import type { ReverseGeocoder } from '@/data/geocoder'
import { locations as publicLocations, type LocationRepository } from '@/data/locations'
import { OrderError, type OrderFailure, type OrderRepository } from '@/data/orders'
import { readPin } from '@/entities/location/pin'
import { MAX_QUANTITY, type OrderReceipt } from '@/entities/order/order'
import { validateOrder, type FieldError, type FieldName } from '@/entities/order/validate'
import { formatPeso } from '@/shared/lib/money'
import { plural } from '@/shared/lib/plural'
import { Field } from '@/shared/ui/Field'
import { useModalBusy } from '@/shared/ui/modalBusy'
import { CardPicker } from './CardPicker'
import { DeliveryFields } from './DeliveryFields'
import styles from './OrderForm.module.css'
import { cardTotal, type Quantities } from './quantities'

type Errors = Partial<Record<FieldName, FieldError>>

type Props = {
  /** One card in centavos, for the running total. The server decides what is charged. */
  price: number
  /** Fills the name field to start with. */
  name?: string | undefined
  repository: OrderRepository
  /** Where the province, city and barangay lists come from. */
  locations?: LocationRepository | undefined
  /** Where the map panel looks up addresses. Left out, the public one is used. */
  geocoder?: ReverseGeocoder | undefined
  onDone: (receipt: OrderReceipt, phone: string) => void
}

// Focus goes to the first problem, in the order the customer sees the fields. The pin opens the delivery details.
const FIELD_ORDER: FieldName[] = ['platforms', 'fullName', 'phone', 'pin', 'province', 'city', 'barangay', 'street', 'landmark', 'consent']

function errorText(field: FieldName, code: FieldError): string {
  const text = copy.order.errors
  if (field === 'consent') return text.consent
  if (field === 'platforms') return code === 'quantity' ? text.quantity.replace('{max}', String(MAX_QUANTITY)) : text.choose
  if (field === 'pin') return code === 'invalid' ? text.pin.invalid : text.pin.required
  if (code === 'invalid') return field === 'phone' ? text.phone : field === 'fullName' ? text.fullName : text.invalid
  return text[code]
}

export function OrderForm({ price, name, repository, locations = publicLocations, geocoder, onDone }: Props) {
  const { fields } = copy.order
  const formRef = useRef<HTMLFormElement>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<OrderFailure | null>(null)
  const [sending, setSending] = useState(false)
  // The order call cannot be taken back, so a way out would only hide its answer.
  useModalBusy(sending)
  const [quantities, setQuantities] = useState<Quantities>({})
  const count = cardTotal(quantities)

  const message = (field: FieldName) => {
    const code = errors[field]
    return code ? errorText(field, code) : undefined
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

    const data = new FormData(event.currentTarget)
    const text = (name: string) => String(data.get(name) ?? '')

    // Hidden trap field: people never fill it, simple bots do. Pretend it worked and send nothing.
    if (text('website') !== '') {
      onDone({ reference: 'OK', demo: false }, text('phone'))
      return
    }

    // Every chosen platform sends its own quantity field, named after it.
    const items = data.getAll('platforms').map((value) => {
      const platform = String(value)
      return { platform, quantity: Number(text(`quantity-${platform}`)) }
    })

    const result = validateOrder({
      items,
      fullName: text('fullName'),
      phone: text('phone'),
      province: text('province'),
      city: text('city'),
      barangay: text('barangay'),
      street: text('street'),
      landmark: text('landmark'),
      consent: data.get('consent') === 'on',
      // The map panel keeps these as hidden inputs. Blank means no pin; anything else is checked by validateOrder.
      pin: readPin(text('lat'), text('lng')),
      mapUnavailable: text('mapUnavailable') === '1',
    })

    if (!result.ok) {
      setErrors(result.errors)
      setFailure(null)
      const first = FIELD_ORDER.find((field) => result.errors[field])
      const target = first && formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"], [name="${first}"]:not([type="hidden"])`)
      target?.focus()
      return
    }

    setErrors({})
    setFailure(null)
    setSending(true)
    try {
      onDone(await repository.submit(result.order), result.order.phone)
    } catch (error) {
      setFailure(error instanceof OrderError ? error.code : 'network')
      setSending(false)
    }
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
      <CardPicker price={price} quantities={quantities} onChange={setQuantities} error={message('platforms')} />

      <div className={styles.section}>
        <Field name="fullName" label={fields.fullName.label} placeholder={fields.fullName.placeholder} autoComplete="name" maxLength={80} defaultValue={name} error={message('fullName')} />
        <Field name="phone" type="tel" inputMode="tel" label={fields.phone.label} placeholder={fields.phone.placeholder} hint={fields.phone.hint} autoComplete="tel" maxLength={20} error={message('phone')} />
      </div>

      <DeliveryFields locations={locations} geocoder={geocoder} message={message} />

      <div className={styles.trap} aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className={styles.consent}>
          <input type="checkbox" name="consent" aria-invalid={errors.consent ? true : undefined} />
          <span>{copy.order.consent}</span>
        </label>
        {errors.consent && <p className={styles.error}>{message('consent')}</p>}
      </div>

      <div className={styles.status} role="alert">
        {hasErrors && !failure && <p>{copy.order.errors.summary}</p>}
        {failure && <p>{copy.order.errors.submit[failure]}</p>}
      </div>

      <div className={styles.footer}>
        <p className={styles.summary} role="status">
          <span>
            {copy.order.total} · {plural(count, copy.order.cards.count)}
          </span>
          <strong>{formatPeso(count * price)}</strong>
        </p>
        <button type="submit" className={styles.submit} disabled={sending}>
          {sending ? copy.order.sending : copy.order.submit}
        </button>
      </div>
    </form>
  )
}
