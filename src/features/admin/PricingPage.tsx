import { useRef, type FormEvent } from 'react'
import { copy } from '@/config/copy'
import { pricing, pricingDemo, type PricingRepository } from '@/data/pricing'
import { parsePesos, PRICE_KEYS, yearSaving, type PriceError, type PriceKey } from '@/entities/pricing/pricing'
import { formatPeso } from '@/shared/lib/money'
import { PageHeader } from './PageHeader'
import { Panel } from './Panel'
import styles from './PricingPage.module.css'
import { Block, Pulse } from './Skeleton'
import ui from './ui.module.css'
import { usePricingEditor, type PriceValues } from './usePricingEditor'

const text = copy.admin.pricing

type Props = { repository?: PricingRepository }

function errorText(code: PriceError): string {
  return text.errors[code]
}

/** The line under the annual price: what a year saves against twelve months, as it stands in the form. */
function yearNote(values: PriceValues): string | null {
  const month = parsePesos(values.month)
  const year = parsePesos(values.year)
  if (month === null || year === null) return null
  const result = yearSaving({ month, year })
  if (result.saving <= 0 || result.percent <= 0) return text.noSaving
  return text.yearNote
    .replace('{month}', formatPeso(result.perMonth))
    .replace('{percent}', String(result.percent))
    .replace('{saving}', formatPeso(result.saving))
}

/** Where the admin sets what the landing page charges for each offer. */
export function PricingPage({ repository = pricing }: Props) {
  const editor = usePricingEditor(repository)
  const formRef = useRef<HTMLFormElement>(null)
  const { values, errors, phase } = editor

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const first = await editor.save()
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  }

  const hint = (key: PriceKey) => (key === 'year' && values ? (yearNote(values) ?? text.fields.year.hint) : text.fields[key].hint)
  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className={styles.page}>
      <title>{text.title}</title>
      <PageHeader title={text.title} />
      <p className={styles.intro}>{text.intro}</p>

      {editor.status === 'error' && (
        <p role="alert" className={styles.note}>
          {text.loadError}
          <button type="button" className={styles.secondary} onClick={editor.retry}>
            {copy.admin.retry}
          </button>
        </p>
      )}

      {editor.status === 'loading' && (
        <Panel className={styles.panel}>
          <p role="status" className={ui.visuallyHidden}>
            {text.loading}
          </p>
          <Pulse className={styles.form}>
            {PRICE_KEYS.map((key) => (
              <Block key={key} height={96} shape="round" />
            ))}
          </Pulse>
        </Panel>
      )}

      {editor.status === 'ready' && values && (
        <Panel className={styles.panel}>
          <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
            {PRICE_KEYS.map((key) => {
              const error = errors[key]
              const id = `price-${key}`
              return (
                <div key={key} className={styles.field}>
                  <label htmlFor={id} className={styles.label}>
                    {text.fields[key].label}
                  </label>
                  <div className={styles.control}>
                    <span className={styles.peso} aria-hidden="true">
                      ₱
                    </span>
                    <input
                      id={id}
                      name={key}
                      className={`${ui.field} ${styles.input}`}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={9}
                      value={values[key]}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={`${id}-note`}
                      onChange={(event) => editor.change(key, event.target.value)}
                    />
                  </div>
                  <p id={`${id}-note`} className={error ? styles.error : styles.hint}>
                    {error ? errorText(error) : hint(key)}
                  </p>
                </div>
              )
            })}

            <div className={styles.status} role="status">
              {hasErrors && <p className={styles.error}>{text.errors.summary}</p>}
              {phase === 'failed' && <p className={styles.error}>{text.errors.save}</p>}
              {phase === 'saved' && <p className={styles.saved}>{text.saved}</p>}
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={phase === 'sending' || !editor.dirty}>
                {phase === 'sending' ? text.sending : text.save}
              </button>
              <button type="button" className={styles.secondary} disabled={phase === 'sending' || !editor.dirty} onClick={editor.reset}>
                {text.reset}
              </button>
            </div>
          </form>
          <p className={styles.small}>{text.orders}</p>
          {pricingDemo && <p className={styles.small}>{text.demo}</p>}
        </Panel>
      )}
    </div>
  )
}
