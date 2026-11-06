import { useId, useState } from 'react'
import { copy } from '@/config/copy'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { fill } from '@/shared/lib/fill'
import { Description, PriceAmount, SoldOutLabel, Variants } from '../../cards/CardParts'
import { soldOutAttr } from '../../cards/cardState'
import { Icon, ProductDetails } from '../kit'
import { fadeIn } from './fadeIn'
import { words } from './words'
import styles from './ProductRow.module.css'

type Props = {
  product: Product
  /** The tag of the name (`tags.product`). */
  as: 'h3' | 'h4'
  groups: ModifierGroup[]
  interactive: boolean
  layout: 'grid' | 'list'
  photo: string | null
  /** True for the first rows of the page: their pictures should not wait to scroll into view. */
  eager: boolean
}

/**
 * One row on a pasted label: a small photo, if there is one, then the name, the price and all there is to
 * read. Nothing is cut short. Sizes are printed; only add-ons, which can be many, open under a text link.
 */
export function ProductRow({ product, as: Heading, groups, interactive, layout, photo, eager }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const addOns = product.groupIds.some((id) => groups.some((group) => group.id === id))
  return (
    <li className={styles.row} data-layout={layout} data-sold-out={soldOutAttr(product)} data-photo={photo === null ? undefined : ''}>
      {photo !== null && (
        <span className={styles.photo}>
          <img ref={interactive ? fadeIn : undefined} src={photo} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
        </span>
      )}
      <div className={styles.text}>
        <div className={styles.head}>
          <Heading className={styles.name}>{product.name}</Heading>
          <PriceAmount product={product} className={styles.price} />
        </div>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Description product={product} className={styles.description} />
        <Variants product={product} className={styles.sizes} />
        {product.tags.length > 0 && (
          <ul className={styles.tags}>
            {product.tags.map((tag) => (
              <li key={tag}>{copy.menu.view.tags[tag]}</li>
            ))}
          </ul>
        )}
        {addOns &&
          (interactive ? (
            <button type="button" className={styles.more} aria-expanded={open} aria-controls={panelId} aria-label={fill(words.addOnsOf, { name: product.name })} onClick={() => setOpen((now) => !now)}>
              {words.addOns}
              <Icon name="chevronDown" />
            </button>
          ) : (
            <span className={styles.more}>
              {words.addOns}
              <Icon name="chevronDown" />
            </span>
          ))}
        {addOns && interactive && (
          <div id={panelId} className={styles.panel} data-open={open ? '' : undefined}>
            <div className={styles.panelClip}>
              <div className={styles.panelBody}>
                <ProductDetails product={{ ...product, variants: [] }} groups={groups} ground="card" />
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}
