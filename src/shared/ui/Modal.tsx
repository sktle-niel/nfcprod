import { useEffect, useId, useState, type ReactNode } from 'react'
import styles from './Modal.module.css'

type Props = {
  title: ReactNode
  subtitle?: ReactNode
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
}

/**
 * A modal sheet on the native dialog, which brings focus trapping, Esc and the backdrop with it.
 * It rises from the bottom edge on phones. A click on the dimmed backdrop closes it.
 */
export function Modal({ title, subtitle, closeLabel, onClose, children, top, centered = false, wide = false }: Props) {
  // The element sits in state, not in a ref, so `close` can be handed to the content during render.
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null)
  const titleId = useId()
  // Closing the dialog fires its close event (and so onClose), and the browser puts focus back where it was.
  const close = () => dialog?.close()

  useEffect(() => {
    if (dialog && !dialog.open) dialog.showModal()
  }, [dialog])

  return (
    <dialog
      ref={setDialog}
      className={wide ? `${styles.dialog} ${styles.wide}` : styles.dialog}
      aria-labelledby={titleId}
      data-lenis-prevent
      onClose={onClose}
      onClick={(event) => {
        // A click on the dimmed area lands on the dialog element itself, not on the sheet.
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <div className={`${styles.sheet} ${centered ? styles.centered : ''}`}>
        <div className={styles.closeBar}>
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={close}>
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
        {typeof children === 'function' ? children(close) : children}
      </div>
    </dialog>
  )
}
