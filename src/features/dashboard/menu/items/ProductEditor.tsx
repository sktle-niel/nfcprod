import { dashboardCopy } from '@/config/dashboardCopy'
import type { Product } from '@/entities/menu/menu'
import { Modal } from '@/shared/ui/Modal'
import type { SavedProduct } from './productEditor/formState'
import { ProductForm } from './productEditor/ProductForm'

export type ProductEditorProps = {
  /** The product to change, or null to add one. */
  product: Product | null
  /** The category a new product starts in. Ignored when `product` is given. */
  categoryId: string | null
  /** Called after a save, just before the dialog closes. */
  onSaved?: ((saved: SavedProduct) => void) | undefined
  onClose: () => void
}

/**
 * The dialog to add or change an item. It is open for as long as it is mounted, and calls `onClose` once when it closes:
 * after a save, from Cancel or the close button, on Escape and on a click on the backdrop.
 */
export function ProductEditor({ product, categoryId, onSaved, onClose }: ProductEditorProps) {
  const text = dashboardCopy.productEditor
  return (
    <Modal wide title={product ? text.editTitle : text.addTitle} closeLabel={text.close} onClose={onClose}>
      {(close) => <ProductForm product={product} categoryId={categoryId} onSaved={onSaved} onDone={close} />}
    </Modal>
  )
}
