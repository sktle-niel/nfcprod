import { useDashboardData } from '@/features/dashboard/dashboardData'
import { ProductEditor } from '../ProductEditor'
import type { SavedProduct } from './formState'

type Props = {
  product?: string | undefined
  category?: string | undefined
  onSaved?: (saved: SavedProduct) => void
  onClose: () => void
}

/** Mounts the editor the way the items list does, with a product and a category of the real menu found by name. For tests. */
export function EditorHost({ product, category, onSaved, onClose }: Props) {
  const { menu } = useDashboardData()
  const found = product ? (menu.products.find((candidate) => candidate.name === product) ?? null) : null
  const home = category ? (menu.categories.find((candidate) => candidate.name === category)?.id ?? null) : null
  return <ProductEditor product={found} categoryId={home} onSaved={onSaved} onClose={onClose} />
}
