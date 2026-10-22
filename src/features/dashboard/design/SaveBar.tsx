import { useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { Button } from '@/shared/ui/Button'
import { SaveStatus, type SaveState } from '@/shared/ui/SaveStatus'
import { useSaveBarHeight } from './useSaveBarHeight'
import styles from './SaveBar.module.css'

const text = dashboardCopy.design.bar

type Props = {
  dirty: boolean
  busy: boolean
  /** A logo is still on its way: saving or discarding now would lose it. */
  uploading?: boolean
  status: SaveState
  /** Why the save failed when no field is to blame: a lost connection, a signed-out session. */
  notice: string
  onDiscard: () => void
  className?: string
}

/** Save and Discard, what is going on, and whether anything is unsaved. The Save button submits the page's form. */
export function SaveBar({ dirty, busy, uploading = false, status, notice, onDiscard, className }: Props) {
  const bar = useRef<HTMLDivElement>(null)
  useSaveBarHeight(bar)

  return (
    <div ref={bar} className={className ? `${styles.bar} ${className}` : styles.bar}>
      <div className={styles.messages}>
        <SaveStatus status={status} messages={text.status} />
        {notice && (
          <p role="alert" className={styles.notice}>
            {notice}
          </p>
        )}
        <p className={styles.hint}>{dirty ? text.unsaved : text.upToDate}</p>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" disabled={!dirty || busy || uploading} onClick={onDiscard}>
          {text.discard}
        </Button>
        <Button type="submit" busy={busy} disabled={!dirty || uploading}>
          {text.save}
        </Button>
      </div>
    </div>
  )
}
