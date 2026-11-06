import { Fragment } from 'react'
import { copy } from '@/config/copy'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { variantsText } from '../../productPrice'
import { optionExtra } from './details'
import styles from './ProductDetails.module.css'

const text = copy.menu.view.template

type Props = {
  product: Product
  /** The add-on groups of the menu: the product's own are picked out by `groupIds`. */
  groups: ModifierGroup[]
  /** The ground the details sit on, so the quiet words use the muted color made for it. */
  ground: 'page' | 'card'
  className?: string | undefined
}

/**
 * The sizes of a product and the add-ons it offers, as a small description list, for the templates that open a card ("More",
 * a plus). Nothing to order from: the menu only shows. Draws nothing for a product with no sizes and no add-ons.
 */
export function ProductDetails({ product, groups, ground, className }: Props) {
  const own = product.groupIds.flatMap((id) => groups.find((group) => group.id === id) ?? [])
  if (product.variants.length === 0 && own.length === 0) return null
  return (
    <dl className={`${styles.details} ${ground === 'card' ? styles.onCard : styles.onPage} ${className ?? ''}`.trim()}>
      {product.variants.length > 0 && (
        <>
          <dt>{text.sizes}</dt>
          <dd>{variantsText(product)}</dd>
        </>
      )}
      {own.map((group) => (
        <div key={group.id} className={styles.group}>
          <dt>{group.name}</dt>
          <dd>
            {group.options.map((option, index) => (
              <Fragment key={option.id}>
                {index > 0 && ' · '}
                {option.label} <span className={styles.extra}>{optionExtra(option, group)}</span>
              </Fragment>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}
