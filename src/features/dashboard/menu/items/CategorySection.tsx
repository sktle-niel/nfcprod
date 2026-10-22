import { useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Category, Product } from '@/entities/menu/menu'
import { useDashboardData } from '@/features/dashboard/dashboardData'
import { ownerErrorText } from '@/features/dashboard/ownerErrors'
import { useAsyncAction } from '@/features/dashboard/useAsyncAction'
import { plural } from '@/shared/lib/plural'
import { Button } from '@/shared/ui/Button'
import { IconPlus } from '@/shared/ui/icons'
import { Switch } from '@/shared/ui/Switch'
import ui from '@/shared/ui/ui.module.css'
import { fill } from '@/shared/lib/fill'
import { CategoryHeader } from './CategoryHeader'
import styles from './CategorySection.module.css'
import { DeleteDialog } from './DeleteDialog'
import { movedText } from '../movedText'
import { focusAfterMove } from '../reorder'
import { focusKeys, type Notify } from './notify'
import { ProductRow } from './ProductRow'

const text = dashboardCopy.items.category

type Props = {
  category: Category
  /** The items to list: all of them, or the ones that match the search. */
  products: Product[]
  /** How many items the category holds in all, for the delete question. */
  total: number
  index: number
  count: number
  reorder: boolean
  /** The control that gets the focus when this category is deleted. */
  afterDelete: string
  notify: Notify
  onEdit: (product: Product | null, categoryId: string) => void
}

/** The control that gets the focus when the item at `position` goes: the next item, else the one before, else Add item. */
function afterProductDelete(products: Product[], position: number, categoryId: string): string {
  const other = products[position + 1] ?? products[position - 1]
  return other ? focusKeys.edit(other.id) : focusKeys.addItem(categoryId)
}

/** One category of the menu: its name and controls, then its items, then Add item. The h2 is the category name. */
export function CategorySection({ category, products, total, index, count, reorder, afterDelete, notify, onEdit }: Props) {
  const { actions } = useDashboardData()
  const change = useAsyncAction()
  const removal = useAsyncAction()
  const [confirming, setConfirming] = useState(false)
  // The rename and the visibility switch both send the whole category, so the second one would carry the old name or flag
  // over the first. The switch waits while the rename form is open.
  const [renaming, setRenaming] = useState(false)
  const { id, name } = category

  async function setVisible(visible: boolean) {
    const outcome = await change.run(() => actions.saveCategory({ id, name, visible }))
    if (outcome.ok) notify(fill((visible ? text.shown : text.hidden), { name }))
  }

  async function move(delta: -1 | 1) {
    const outcome = await change.run(() => actions.moveCategory(id, delta))
    if (!outcome.ok) return
    notify(movedText(text.moved, name, index + delta, count), focusAfterMove(id, delta))
  }

  async function remove() {
    const outcome = await removal.run(() => actions.deleteCategory(id))
    if (outcome.ok) notify(fill(text.deleted, { name }), afterDelete)
  }

  return (
    <div className={styles.section}>
      <header className={styles.head}>
        <CategoryHeader
          category={category}
          first={index === 0}
          last={index === count - 1}
          reorder={reorder}
          busy={change.busy}
          renaming={renaming}
          onRenaming={setRenaming}
          notify={notify}
          onMove={move}
          onDelete={() => setConfirming(true)}
        />
        <div className={styles.visible}>
          <Switch
            label={
              <>
                {text.visibleLabel}
                <span className={ui.visuallyHidden}>: {name}</span>
              </>
            }
            description={category.visible ? undefined : text.hiddenNote}
            checked={category.visible}
            busy={change.busy || renaming}
            onChange={setVisible}
          />
        </div>
      </header>
      {change.failed && (
        <p role="alert" className={styles.alert}>
          {ownerErrorText(change.error)}
        </p>
      )}
      {products.length === 0 ? (
        <p className={styles.none}>{text.noItems}</p>
      ) : (
        <ul className={styles.list}>
          {products.map((product, position) => (
            <ProductRow
              key={product.id}
              product={product}
              index={position}
              count={products.length}
              reorder={reorder}
              afterDelete={afterProductDelete(products, position, id)}
              notify={notify}
              onEdit={(chosen) => onEdit(chosen, id)}
            />
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        size="sm"
        data-focus={focusKeys.addItem(id)}
        aria-label={fill(text.addItemLabel, { name })}
        onClick={() => onEdit(null, id)}
      >
        <IconPlus size={16} />
        {text.addItem}
      </Button>
      {confirming && (
        <DeleteDialog
          title={fill(text.deleteTitle, { name })}
          body={total === 0 ? text.deleteEmpty : plural(total, text.deleteWithItems)}
          confirmLabel={text.confirmDelete}
          busy={removal.busy}
          error={removal.error}
          onConfirm={remove}
          onCancel={() => {
            setConfirming(false)
            removal.clear()
          }}
        />
      )}
    </div>
  )
}
