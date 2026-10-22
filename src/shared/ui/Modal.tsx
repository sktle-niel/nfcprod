import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Modal.module.css'
import { ModalBusyContext } from './modalBusy'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
  /** The id of the element inside that describes the dialog, read after its name. */
  describedBy?: string
  closeLabel: string
  onClose: () => void
  /** As a function it gets `close`, for a button inside that ends the task, for example "Done". */
  children: ReactNode | ((close: () => void) => ReactNode)
  /** Shown above the title, for example the logo. */
  top?: ReactNode
  /** Centers the heading, for short focused tasks like signing in. */
  centered?: boolean
  /** A wider sheet, for longer forms. */
  wide?: boolean
  /**
   * Work is running and cannot be taken back. The corner button is off, and the backdrop, Escape and the back gesture do
   * nothing. The `close` handed to the content still works. A form inside can say the same with `useModalBusy`.
   */
  busy?: boolean
}

/**
 * A modal sheet on the native dialog, which brings focus trapping, Esc and the backdrop with it.
 * It rises from the bottom edge on phones. A click on the dimmed backdrop closes it: a press and a release that both
 * land there, not a drag that only ends there.
 */
export function Modal({ title, subtitle, describedBy, closeLabel, onClose, children, top, centered = false, wide = false, busy: busyProp = false }: Props) {
  // The element sits in state, not in a ref, so `close` can be handed to the content during render.
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const titleId = useId()
  // Closing the dialog fires its close event (and so onClose), and the browser puts focus back where it was.
  // This close is for the content (a Done button, a form that saved), so it is never held back by `busy`. Every dismissal by
  // the person goes through a guard instead.
  // A browser sends the close event a moment after close(), so the note stays on the element until that event reads it.
  const close = () => {
    if (!dialog?.open) return
    dialog.setAttribute('data-closing', '')
    dialog.close()
  }
  // Work is running, said by the parent (`busy`) or by a form inside (`useModalBusy`). The dialog then cannot be dismissed:
  // the call is on its way and cannot be taken back, so a way out would only hide what is happening.
  const [innerBusy, setInnerBusy] = useState(false)
  const busy = busyProp || innerBusy
  const busyNow = useRef(false)
  // Where the last press began. A mouse drag that starts in the sheet (panning the map, selecting text) and lets go over the
  // backdrop makes the browser send the click to the dialog, the closest element that holds both ends. That click must not
  // close the dialog, or the whole form is lost. Both press events are read in the capture phase, so a control in the sheet
  // that stops them from bubbling cannot leave an older press behind as the note.
  const pressStart = useRef<EventTarget | null>(null)

  useEffect(() => {
    if (dialog && !dialog.open) dialog.showModal()
  }, [dialog])

  useLayoutEffect(() => {
    busyNow.current = busy
    // `closedby="none"` is the one thing that held against repeated Escape presses and back gestures in Chrome: after the
    // first one the browser sends a cancel event that cannot be stopped. Browsers without it use the handlers below.
    if (busy) dialog?.setAttribute('closedby', 'none')
    else dialog?.removeAttribute('closedby')
  }, [busy, dialog])

  return (
    <dialog
      ref={setDialog}
      className={wide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      data-lenis-prevent
      onKeyDown={(event) => {
        if (busy && event.key === 'Escape') event.preventDefault()
      }}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      onClose={(event) => {
        // Last backstop: a browser that closed the dialog anyway while work is running gets it back.
        const byContent = event.currentTarget.hasAttribute('data-closing')
        event.currentTarget.removeAttribute('data-closing')
        if (busyNow.current && !byContent) {
          event.currentTarget.showModal()
          return
        }
        onClose()
      }}
      onPointerDownCapture={(event) => {
        pressStart.current = event.target
      }}
      onPointerUpCapture={(event) => {
        // The other way round: a press that began on the backdrop and ends in the sheet is no click on the backdrop either.
        if (event.target !== event.currentTarget) pressStart.current = null
      }}
      onClick={(event) => {
        // A click on the dimmed area lands on the dialog element itself, not on the sheet. It counts when the press began there too.
        if (!busy && event.target === event.currentTarget && pressStart.current === event.currentTarget) close()
      }}
    >
      <div className={`${styles.sheet} ${centered ? styles.centered : ''}`}>
        <div className={styles.closeBar}>
          <button type="button" className={styles.close} aria-label={closeLabel} disabled={busy} onClick={close}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>
        {top}
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {subtitle && <p className={styles.sub}>{subtitle}</p>}
        </header>
        <ModalBusyContext.Provider value={setInnerBusy}>{typeof children === 'function' ? children(close) : children}</ModalBusyContext.Provider>
      </div>
    </dialog>
  )
}
