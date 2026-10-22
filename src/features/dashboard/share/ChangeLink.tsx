import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { OwnerError } from '@/data/ownerRepository'
import { SLUG_MAX } from '@/entities/business/slug'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { useOwnedBusiness } from '../dashboardData'
import { ownerErrorText } from '../ownerErrors'
import { menuLink } from '../menuLink'
import { useAsyncAction } from '../useAsyncAction'
import { useSlugCheck, type SlugCheck } from '../useSlugCheck'
import styles from './ChangeLink.module.css'

const text = dashboardCopy.share.change

const TONE: Record<SlugCheck, 'good' | 'bad' | 'quiet'> = {
  idle: 'quiet',
  checking: 'quiet',
  available: 'good',
  yours: 'quiet',
  taken: 'bad',
  invalid: 'bad',
  reserved: 'bad',
  failed: 'bad',
}

type Props = {
  /** The link was changed. */
  onDone: () => void
  onCancel: () => void
}

/** The form that changes the slug: a live check of the new one, then a plain warning before anything is changed. */
export function ChangeLink({ onDone, onCancel }: Props) {
  const { business, actions } = useOwnedBusiness()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [slug, setSlug] = useState(business.slug)
  const [confirming, setConfirming] = useState(false)
  // Set when the question closes because the link was taken: the field takes the focus once the dialog is gone.
  const refocus = useRef(false)
  // A link the server refused as taken even though the check said free (someone took it in between).
  const [lostSlug, setLostSlug] = useState<string | null>(null)
  const { run, busy, error, clear } = useAsyncAction()
  const [attempt, setAttempt] = useState(0)
  const checked = useSlugCheck(slug, business.slug, actions.checkSlug, { attempt })
  const status: SlugCheck = lostSlug === slug ? 'taken' : checked

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  // While the modal dialog is open the page behind it cannot take focus, so this waits until the dialog is gone.
  useEffect(() => {
    if (!confirming && refocus.current) {
      refocus.current = false
      input.current?.focus()
    }
  }, [confirming])

  const confirm = async () => {
    const outcome = await run(() => actions.changeSlug(slug))
    if (outcome.ok) {
      onDone()
    } else if (outcome.error instanceof OwnerError && outcome.error.code === 'slugTaken') {
      setLostSlug(slug)
      refocus.current = true
      setConfirming(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (status !== 'available') return
    // A refusal from an earlier try must not greet the owner when the question opens again.
    clear()
    setConfirming(true)
  }
  const words = status === 'idle' ? '' : text.status[status]
  const bad = TONE[status] === 'bad'

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label htmlFor={id} className={styles.label}>
        {text.label}
      </label>
      <div className={styles.box} data-bad={bad}>
        <span className={styles.prefix} aria-hidden="true">
          /m/
        </span>
        <input
          ref={input}
          id={id}
          className={styles.input}
          value={slug}
          maxLength={SLUG_MAX}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={bad || undefined}
          aria-describedby={`${id}-hint ${id}-status`}
          onChange={(event) => setSlug(event.target.value.toLowerCase())}
        />
      </div>
      <p id={`${id}-hint`} className={styles.hint}>
        {text.hint}
      </p>
      <div className={styles.statusRow}>
        <p id={`${id}-status`} role="status" className={styles.status} data-tone={TONE[status]}>
          {words}
        </p>
        {status === 'failed' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAttempt((n) => n + 1)
              // The button is gone as soon as the check starts again, so the focus goes to the field it belongs to.
              input.current?.focus()
            }}
          >
            {text.recheck}
          </Button>
        )}
      </div>
      {status === 'available' && <p className={styles.preview}>{text.preview.replace('{url}', menuLink(slug))}</p>}
      <div className={styles.actions}>
        <Button type="submit" disabled={status !== 'available'}>
          {text.submit}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {text.cancel}
        </Button>
      </div>
      {confirming && (
        <ConfirmDialog
          danger
          title={text.confirm.title}
          body={
            <>
              {text.confirm.body.replace('{url}', menuLink(slug)).replace('{old}', menuLink(business.slug))}
              {error !== null && (
                <>
                  {' '}
                  <strong role="alert">{ownerErrorText(error)}</strong>
                </>
              )}
            </>
          }
          confirmLabel={text.confirm.confirm}
          cancelLabel={text.confirm.cancel}
          closeLabel={text.confirm.close}
          busy={busy}
          onConfirm={() => void confirm()}
          onCancel={() => {
            clear()
            setConfirming(false)
          }}
        />
      )}
    </form>
  )
}
