import { copy } from '@/config/copy'
import type { Product } from '@/entities/menu/menu'
import { formatPeso } from '@/shared/lib/money'
import { priceText, variantsText } from '../productPrice'

const text = copy.menu.view

type Part = { className?: string | undefined }

/** "Sold out", as words: the state is never only a color. */
export function SoldOutLabel({ product, className }: Part & { product: Product }) {
  return product.available ? null : <span className={className}>{text.soldOut}</span>
}

export function Description({ product, className }: Part & { product: Product }) {
  return product.description === '' ? null : <p className={className}>{product.description}</p>
}

/** The price line: the price, or "From {lowest}" when the product has sizes or options. */
export function Price({ product, className }: Part & { product: Product }) {
  return <p className={className}>{priceText(product, text.from)}</p>
}

/** The lowest price alone, without "From", for the shapes that draw a bare number (a badge, a pill, a tag). */
export function PriceAmount({ product, className }: Part & { product: Product }) {
  const lowest = product.variants.length === 0 ? product.price : Math.min(...product.variants.map((variant) => variant.price))
  return <span className={className}>{formatPeso(lowest)}</span>
}

/** "S ₱120 · M ₱140" on one line, or nothing when the product has no sizes. */
export function Variants({ product, className }: Part & { product: Product }) {
  if (product.variants.length === 0) return null
  return <p className={className}>{variantsText(product)}</p>
}

/** The sizes as a list of their own, for the shapes that line sizes and prices up. */
export function VariantList({
  product,
  className,
  itemClassName,
  labelClassName,
  priceClassName,
}: Part & { product: Product; itemClassName?: string | undefined; labelClassName?: string | undefined; priceClassName?: string | undefined }) {
  if (product.variants.length === 0) return null
  return (
    <ul className={className}>
      {product.variants.map((variant) => (
        <li key={variant.id} className={itemClassName}>
          <span className={labelClassName}>{variant.label}</span> <span className={priceClassName}>{formatPeso(variant.price)}</span>
        </li>
      ))}
    </ul>
  )
}

export function Tags({ product, className, tagClassName }: Part & { product: Product; tagClassName?: string | undefined }) {
  if (product.tags.length === 0) return null
  return (
    <ul className={className}>
      {product.tags.map((tag) => (
        <li key={tag} className={tagClassName}>
          {text.tags[tag]}
        </li>
      ))}
    </ul>
  )
}

/** "Add-ons available", when at least one of the product's add-on groups is on the menu. */
export function AddOnsNote({ show, className }: Part & { show: boolean }) {
  return show ? <p className={className}>{text.addOnsAvailable}</p> : null
}
