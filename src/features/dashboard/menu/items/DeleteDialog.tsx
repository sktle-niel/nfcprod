import { dashboardCopy } from '@/config/dashboardCopy'
import { ownerErrorText } from '@/features/dashboard/ownerErrors'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import styles from './DeleteDialog.module.css'

type Props = {
  title: string
  body: string
  confirmLabel: string
  busy: boolean
  /** What the last attempt failed with, or null. The dialog stays open to show it. */
  error: unknown
  onConfirm: () => void
  onCancel: () => void
}

/** The "are you sure" for deleting a category or an item. Focus starts on Keep it; a failure is said inside. */
export function DeleteDialog({ title, body, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  return (
    <ConfirmDialog
      danger
      title={title}
      body={
        <>
          {body}
          {error !== null && (
            <span role="alert" className={styles.alert}>
              {ownerErrorText(error)}
            </span>
          )}
        </>
      }
      confirmLabel={confirmLabel}
      cancelLabel={dashboardCopy.items.dialog.cancel}
      closeLabel={dashboardCopy.items.dialog.close}
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
