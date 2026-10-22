import styles from './SaveStatus.module.css'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type Props = {
  status: SaveState
  /** The words for each state. The component never makes up text. The idle words are never shown. */
  messages: Record<Exclude<SaveState, 'idle'>, string>
}

/**
 * A live region for the state of a form. It stays in the page the whole time, because screen readers announce a change
 * inside a region that already exists but often miss a region that appears together with its text.
 */
export function SaveStatus({ status, messages }: Props) {
  return (
    <p role="status" className={styles.status} data-state={status}>
      {status === 'idle' ? '' : messages[status]}
    </p>
  )
}
