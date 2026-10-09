import { useId, useRef, useState, type FormEvent } from 'react'
import { copy } from '@/config/copy'
import { OrderError, type OrderFailure, type OrderRepository } from '@/data/orders'
import type { BundleId, OrderReceipt } from '@/entities/order/order'
import { PH_PROVINCES } from '@/entities/order/provinces'
import { validateOrder, type FieldError, type FieldName } from '@/entities/order/validate'
import { Field } from '@/shared/ui/Field'
import { CardPicker } from './CardPicker'
import styles from './OrderForm.module.css'

type Errors = Partial<Record<FieldName, FieldError>>

type Props = {
  bundleId: BundleId
  repository: OrderRepository
  onDone: (receipt: OrderReceipt, phone: string) => void
}

// Focus goes to the first problem, in the order the customer sees the fields.
const FIELD_ORDER: FieldName[] = ['platforms', 'fullName', 'phone', 'province', 'city', 'barangay', 'street', 'landmark', 'consent']

function errorText(field: FieldName, code: FieldError): string {
  const text = copy.order.errors
  if (field === 'consent') return text.consent
  if (field === 'platforms') return code === 'wrongCount' ? text.wrongCount : text.choose
  if (code === 'invalid') return field === 'phone' ? text.phone : field === 'fullName' ? text.fullName : text.invalid
  return text[code]
}

export function OrderForm({ bundleId, repository, onDone }: Props) {
  const { fields } = copy.order
  const formRef = useRef<HTMLFormElement>(null)
  const listId = useId()
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<OrderFailure | null>(null)
  const [sending, setSending] = useState(false)

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

    const result = validateOrder({
      bundleId,
      platforms: data.getAll('platforms').map(String),
      fullName: text('fullName'),
      phone: text('phone'),
      province: text('province'),
      city: text('city'),
      barangay: text('barangay'),
      street: text('street'),
      landmark: text('landmark'),
      consent: data.get('consent') === 'on',
    })

    if (!result.ok) {
      setErrors(result.errors)
      setFailure(null)
      const first = FIELD_ORDER.find((field) => result.errors[field])
      const target = first && formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)
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
      <CardPicker bundleId={bundleId} error={message('platforms')} />

      <div className={styles.section}>
        <Field name="fullName" label={fields.fullName.label} placeholder={fields.fullName.placeholder} autoComplete="name" maxLength={80} error={message('fullName')} />
        <Field name="phone" type="tel" inputMode="tel" label={fields.phone.label} placeholder={fields.phone.placeholder} hint={fields.phone.hint} autoComplete="tel" maxLength={20} error={message('phone')} />
      </div>

      <div className={styles.section}>
        <h3 className={styles.heading}>{copy.order.deliveryTitle}</h3>
        <div className={styles.pair}>
          <Field name="province" label={fields.province.label} placeholder={fields.province.placeholder} autoComplete="address-level1" maxLength={60} list={listId} error={message('province')} />
          <Field name="city" label={fields.city.label} placeholder={fields.city.placeholder} autoComplete="address-level2" maxLength={60} error={message('city')} />
        </div>
        <datalist id={listId}>
          {PH_PROVINCES.map((province) => (
            <option key={province} value={province} />
          ))}
        </datalist>
        <div className={styles.pair}>
          <Field name="barangay" label={fields.barangay.label} placeholder={fields.barangay.placeholder} autoComplete="address-level3" maxLength={60} error={message('barangay')} />
          <Field name="street" label={fields.street.label} placeholder={fields.street.placeholder} autoComplete="address-line1" maxLength={120} error={message('street')} />
        </div>
        <Field name="landmark" multiline label={fields.landmark.label} placeholder={fields.landmark.placeholder} hint={fields.landmark.hint} autoComplete="off" maxLength={200} error={message('landmark')} />
      </div>

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

      <button type="submit" className={styles.submit} disabled={sending}>
        {sending ? copy.order.sending : copy.order.submit}
      </button>
    </form>
  )
}
