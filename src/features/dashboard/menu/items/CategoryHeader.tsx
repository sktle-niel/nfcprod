import { dashboardCopy } from '@/config/dashboardCopy'
import type { Category } from '@/entities/menu/menu'
import { Button } from '@/shared/ui/Button'
import { IconEdit, IconTrash } from '@/shared/ui/icons'
import { fill } from '@/shared/lib/fill'
import { CategoryForm } from './CategoryForm'
import styles from './CategoryHeader.module.css'
import { ReorderButtons } from '../ReorderButtons'
import { focusKeys, type Notify } from './notify'

const text = dashboardCopy.items.category

type Props = {
  category: Category
  first: boolean
  last: boolean
  /** False while searching: the list is partial, so moving a category would be a guess. */
  reorder: boolean
  busy: boolean
  /** Whether the rename form is open. It sits above, so the visibility switch can wait for the rename: both send the whole category. */
  renaming: boolean
  onRenaming: (renaming: boolean) => void
  notify: Notify
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
}

/** The name of a category (the h2) with Rename, the arrows and Delete. Rename swaps the name for a small form. */
export function CategoryHeader({ category, first, last, reorder, busy, renaming, onRenaming, notify, onMove, onDelete }: Props) {
  const { id, name } = category

  if (renaming) {
    return (
      <div className={styles.rename}>
        <CategoryForm
          category={category}
          onSaved={(saved) => {
            onRenaming(false)
            notify(fill(text.saved, { name: saved }), focusKeys.rename(id))
          }}
          onCancel={() => {
            onRenaming(false)
            notify('', focusKeys.rename(id))
          }}
        />
      </div>
    )
  }

  return (
    <>
      <h2 className={styles.title}>{name}</h2>
      <div className={styles.controls}>
        <Button
          variant="secondary"
          size="sm"
          data-focus={focusKeys.rename(id)}
          aria-label={fill(text.renameLabel, { name })}
          disabled={busy}
          onClick={() => onRenaming(true)}
        >
          <IconEdit size={16} />
          {text.rename}
        </Button>
        {reorder && (
          <ReorderButtons
            id={id}
            upLabel={fill(text.moveUp, { name })}
            downLabel={fill(text.moveDown, { name })}
            first={first}
            last={last}
            busy={busy}
            onMove={onMove}
          />
        )}
        <Button variant="secondary" size="sm" aria-label={fill(text.deleteLabel, { name })} onClick={onDelete}>
          <IconTrash size={16} />
          {text.delete}
        </Button>
      </div>
    </>
  )
}
