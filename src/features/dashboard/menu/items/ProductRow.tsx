import { useState } from 'react'
import { copy } from '@/config/copy'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Product } from '@/entities/menu/menu'
import { hasVariants, lowestPrice } from '@/entities/menu/operations'
import { useDashboardData } from '@/features/dashboard/dashboardData'
import { ownerErrorText } from '@/features/dashboard/ownerErrors'
import { useAsyncAction } from '@/features/dashboard/useAsyncAction'
import { formatPeso } from '@/shared/lib/money'
import { pictureSrc } from '@/shared/menu/picture'
import { plural } from '@/shared/lib/plural'
import { Button } from '@/shared/ui/Button'
import { IconImage } from '@/shared/ui/icons'
import { Switch } from '@/shared/ui/Switch'
import ui from '@/shared/ui/ui.module.css'
import { fill } from '@/shared/lib/fill'
import { movedText } from '../movedText'
import { DeleteDialog } from './DeleteDialog'
import { focusAfterMove } from '../reorder'
import { ReorderButtons } from '../ReorderButtons'
import { focusKeys, type Notify } from './notify'
import styles from './ProductRow.module.css'

const text = dashboardCopy.items.product
const tagText = copy.menu.view.tags

type Props = {
  product: Product
  /** Where the item sits among all the items of its category (not only the ones the search shows). */
  index: number
  count: number
  /** False while searching: the list is partial, so moving an item would be a guess. */
  reorder: boolean
  /** The control that gets the focus when this row is deleted. */
  afterDelete: string
  notify: Notify
  onEdit: (product: Product) => void
}

/** One item of a category: picture, name, price, tags, and what the owner can do with it. */
export function ProductRow({ product, index, count, reorder, afterDelete, notify, onEdit }: Props) {
  const { actions } = useDashboardData()
  const change = useAsyncAction()
  const removal = useAsyncAction()
  const [confirming, setConfirming] = useState(false)
  const name = product.name

  async function setAvailable(available: boolean) {
    const outcome = await change.run(() => actions.setAvailable(product.id, available))
    if (outcome.ok) notify(fill((available ? text.nowAvailable : text.nowSoldOut), { name }))
  }

  async function move(delta: -1 | 1) {
    const outcome = await change.run(() => actions.moveProduct(product.id, delta))
    if (!outcome.ok) return
    notify(movedText(text.moved, name, index + delta, count), focusAfterMove(product.id, delta))
  }

  async function remove() {
    const outcome = await removal.run(() => actions.deleteProduct(product.id))
    if (outcome.ok) notify(fill(text.deleted, { name }), afterDelete)
  }

  const price = formatPeso(lowestPrice(product))
  // Drawn only when the public pages would draw it too, so the owner's browser never asks a host the rules do not allow.
  const picture = pictureSrc(product.image)
  return (
    <li className={styles.row}>
      <div className={styles.picture}>
        {picture ? <img src={picture} alt="" loading="lazy" className={styles.image} /> : <IconImage size={22} />}
      </div>
      <div className={styles.info}>
        <p className={styles.name}>{name}</p>
        <p className={styles.price}>
          {hasVariants(product)
            ? `${text.from.replace('{price}', price)} · ${plural(product.variants.length, text.sizes)}`
            : price}
          {!product.available && <span className={styles.soldOut}>{text.soldOut}</span>}
        </p>
        {product.tags.length > 0 && (
          <ul className={styles.tags}>
            {product.tags.map((tag) => (
              <li key={tag} className={styles.tag}>
                {tagText[tag]}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.actions}>
        <Switch
          label={
            <>
              {text.available}
              <span className={ui.visuallyHidden}>: {name}</span>
            </>
          }
          checked={product.available}
          busy={change.busy}
          onChange={setAvailable}
        />
        {reorder && (
          <ReorderButtons
            id={product.id}
            upLabel={fill(text.moveUp, { name })}
            downLabel={fill(text.moveDown, { name })}
            first={index === 0}
            last={index === count - 1}
            busy={change.busy}
            onMove={move}
          />
        )}
        <Button
          variant="secondary"
          size="sm"
          data-focus={focusKeys.edit(product.id)}
          aria-label={fill(text.editLabel, { name })}
          disabled={change.busy}
          onClick={() => onEdit(product)}
        >
          {text.edit}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label={fill(text.deleteLabel, { name })}
          disabled={change.busy}
          onClick={() => setConfirming(true)}
        >
          {text.delete}
        </Button>
      </div>
      {change.failed && (
        <p role="alert" className={styles.alert}>
          {ownerErrorText(change.error)}
        </p>
      )}
      {confirming && (
        <DeleteDialog
          title={fill(text.deleteTitle, { name })}
          body={text.deleteBody}
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
    </li>
  )
}
