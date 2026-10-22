import type { RefObject } from 'react'
import styles from './LoadError.module.css'

type Props = {
  message: string
  retryLabel: string
  onRetry: () => void
  /**
   * Retry usually removes this note and its button. Give the page or the panel around it: its title (the first h1 or h2)
   * takes the focus before the retry starts, so a keyboard user is not dropped on the body.
   */
  focusTitleIn?: RefObject<HTMLElement | null>
  /** The note stays while the retry runs: the message is gone (a status line says it is loading) and Retry is busy. */
  busy?: boolean
}

/** What a page says when its data would not load, with a way to try again. */
export function LoadError({ message, retryLabel, onRetry, focusTitleIn, busy = false }: Props) {
  function retry() {
    if (busy) return
    const title = focusTitleIn?.current?.querySelector<HTMLElement>('h1, h2')
    if (title) {
      if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1')
      title.focus()
    }
    onRetry()
  }

  // While busy the message goes but the button stays the same element, so it keeps the focus, and a second failure
  // puts the message back into the alert, which is read again.
  return (
    <p role="alert" className={styles.note}>
      {busy ? null : message}
      <button type="button" className={styles.retry} aria-disabled={busy || undefined} aria-busy={busy || undefined} onClick={retry}>
        {retryLabel}
      </button>
    </p>
  )
}
