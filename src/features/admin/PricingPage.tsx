import { useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { copy } from '@/config/copy'
import { pricing, pricingDemo, type PricingRepository } from '@/data/pricing'
import { isClean, OFFER_KEYS, parsePercent, parsePesos, yearSaving, type OfferKey } from '@/entities/pricing/pricing'
import { formatPeso } from '@/shared/lib/money'
import { OfferEditor } from './OfferEditor'
import { PageHeader } from './PageHeader'
import styles from './PricingPage.module.css'
import { SegmentedControl } from './SegmentedControl'
import { Block, Pulse } from './Skeleton'
import ui from './ui.module.css'
import { usePricingEditor, type PricingValues } from './usePricingEditor'

const text = copy.admin.pricing

type Props = { repository?: PricingRepository }

/** Under the annual price: what a year saves against twelve months at the prices customers pay, as typed now. */
function yearNote({ month, year }: PricingValues): string | null {
  const read = (values: PricingValues['month']) => {
    const price = parsePesos(values.price)
    const discount = parsePercent(values.discount)
    return price === null || discount === null ? null : { price, discount, perks: [] }
  }
  const monthly = read(month)
  const yearly = read(year)
  if (!monthly || !yearly) return null
  const result = yearSaving({ month: monthly, year: yearly })
  if (result.saving <= 0 || result.percent <= 0) return text.noSaving
  return text.yearNote
    .replace('{month}', formatPeso(result.perMonth))
    .replace('{percent}', String(result.percent))
    .replace('{saving}', formatPeso(result.saving))
}

/**
 * Where the admin sets what each landing page card charges, its discount and what it includes.
 * One offer at a time behind tabs, and a save bar that stays in view.
 */
export function PricingPage({ repository = pricing }: Props) {
  const editor = usePricingEditor(repository)
  const formRef = useRef<HTMLFormElement>(null)
  const [offer, setOffer] = useState<OfferKey>('card')
  const { values, errors, phase } = editor

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const first = await editor.save()
    if (!first) return
    // Input names start with the offer: "year-price", "card-perk-3".
    // Show that offer first, so the input exists to take the focus.
    flushSync(() => setOffer(OFFER_KEYS.find((key) => first.startsWith(`${key}-`)) ?? offer))
    formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  }

  const busy = phase === 'sending'
  const tabs = OFFER_KEYS.map((key) => ({
    value: key,
    label: text.offers[key].tab,
    alert: errors[key] && Object.keys(errors[key]).length > 0 ? text.hasErrors : undefined,
  }))

  return (
    <div className={styles.page}>
      <title>{text.title}</title>
      <PageHeader title={text.title}>
        <SegmentedControl label={text.choose} value={offer} options={tabs} onChange={setOffer} disabled={editor.status !== 'ready'} />
      </PageHeader>
      <p className={styles.intro}>
        {text.intro} {text.orders} {pricingDemo && text.demo}
      </p>

      {editor.status === 'error' && (
        <p role="alert" className={styles.note}>
          {text.loadError}
          <button type="button" className={styles.secondary} onClick={editor.retry}>
            {copy.admin.retry}
          </button>
        </p>
      )}

      {editor.status === 'loading' && (
        <>
          <p role="status" className={ui.visuallyHidden}>
            {text.loading}
          </p>
          <Pulse>
            <Block height={360} shape="round" />
          </Pulse>
        </>
      )}

      {editor.status === 'ready' && values && (
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
          <OfferEditor
            key={offer}
            offer={offer}
            values={values[offer]}
            errors={errors[offer]}
            actions={editor}
            priceNote={offer === 'year' ? yearNote(values) : null}
          />

          <div className={styles.bar}>
            <div className={styles.status} role="status">
              {!isClean(errors) ? (
                <p className={styles.error}>{text.errors.summary}</p>
              ) : phase === 'failed' ? (
                <p className={styles.error}>{text.errors.save}</p>
              ) : phase === 'saved' ? (
                <p className={styles.saved}>{text.saved}</p>
              ) : (
                <p className={styles.hint}>{editor.dirty ? text.unsaved : text.upToDate}</p>
              )}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} disabled={busy || !editor.dirty} onClick={editor.reset}>
                {text.reset}
              </button>
              <button type="submit" className={styles.primary} disabled={busy || !editor.dirty}>
                {busy ? text.sending : text.save}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
