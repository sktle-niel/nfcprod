import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'
import { Modal } from './Modal'

type Props = {
  title: ReactNode
  body: ReactNode
  confirmLabel: string
  cancelLabel: string
  /** The accessible name of the close button in the corner. Differs from the cancel label so the two are told apart. */
  closeLabel: string
  /** A destructive action: the confirm button looks dangerous and focus starts on the safe choice. */
  danger?: boolean
  /** The action is running and cannot be called back: the confirm button is busy, and every way to cancel is off (Cancel, the corner button, Escape, the backdrop). */
  busy?: boolean
  onConfirm: () => void
  /** Cancel button, Escape, the corner button and the backdrop all end here. */
  onCancel: () => void
}

/**
 * A yes/no question on the shared Modal. The parent unmounts it when the answer is handled: confirming does not close
 * the dialog by itself, so a failed action can show its error and keep the question open.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  closeLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const bodyId = useId()

  // The Modal opens its dialog one render after it mounts, and the browser then puts focus on the first control (the corner
  // button). A microtask lets that finish before focus moves to the safe choice.
  useEffect(() => {
    if (!danger) return
    let current = true
    queueMicrotask(() => {
      if (current) cancelRef.current?.focus()
    })
    return () => {
      current = false
    }
  }, [danger])

  return (
    <Modal title={title} describedBy={bodyId} closeLabel={closeLabel} busy={busy} onClose={onCancel}>
      {(close) => (
        <>
          <p id={bodyId} className={styles.body}>{body}</p>
          <div className={styles.actions}>
            <Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>
              {confirmLabel}
            </Button>
            <Button variant="secondary" ref={cancelRef} disabled={busy} onClick={close}>
              {cancelLabel}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
