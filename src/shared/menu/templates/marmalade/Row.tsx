import { useCallback, useId, useState, type SyntheticEvent } from 'react'
import { copy } from '@/config/copy'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { Description, PriceAmount, SoldOutLabel, VariantList } from '../../cards/CardParts'
import { soldOutAttr } from '../../cards/cardState'
import { Icon, motion, ProductDetails } from '../kit'
import { withName, words } from './words'
import styles from './Row.module.css'

type Props = {
  product: Product
  /** The tag of the name (`tags.product`). */
  as: 'h3' | 'h4'
  groups: ModifierGroup[]
  interactive: boolean
  photo: string | null
  /** True for the first rows of the page: their pictures should not wait to scroll into view. */
  eager: boolean
}

/** A picture fades in as it arrives: it holds only until it has loaded or failed, and one already here never holds. */
const arrived = (event: SyntheticEvent<HTMLImageElement>) => event.currentTarget.removeAttribute('data-waiting')

/**
 * One line of the price list: the name, and the price at the right; a product with sizes has one price per size, set side by side
 * under the name. With no picture it is plain lettering. Only add-ons, which can be many, open.
 */
export function Row({ product, as: Heading, groups, interactive, photo, eager }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const addOns = product.groupIds.some((id) => groups.some((group) => group.id === id))
  const holdPicture = useCallback(
    (image: HTMLImageElement | null) => {
      if (image !== null && interactive && !image.complete) image.setAttribute('data-waiting', '')
    },
    [interactive],
  )
  return (
    <li className={styles.row} data-sold-out={soldOutAttr(product)} data-photo={photo === null ? undefined : ''}>
      {photo !== null && (
        <span className={styles.photo}>
          <img ref={holdPicture} src={photo} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={arrived} onError={arrived} />
        </span>
      )}
      <div className={styles.text}>
        <div className={styles.head} data-sizes={product.variants.length > 0 ? '' : undefined}>
          <Heading className={styles.name}>{product.name}</Heading>
          {product.variants.length === 0 ? (
            <PriceAmount product={product} className={styles.price} />
          ) : (
            <VariantList product={product} className={styles.sizes} itemClassName={styles.size} labelClassName={styles.sizeLabel} priceClassName={styles.price} />
          )}
        </div>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Description product={product} className={styles.description} />
        {product.tags.length > 0 && (
          <ul className={styles.tags}>
            {product.tags.map((tag) => (
              <li key={tag} data-tag={tag}>
                {copy.menu.view.tags[tag]}
              </li>
            ))}
          </ul>
        )}
        {addOns &&
          (interactive ? (
            <button
              type="button"
              className={`${styles.more} ${motion.press}`}
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={withName(words.addOnsOf, product.name)}
              onClick={() => setOpen((now) => !now)}
            >
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
            <div className={styles.panelBody}>
              <ProductDetails product={{ ...product, variants: [] }} groups={groups} ground="page" />
            </div>
          </div>
        )}
      </div>
    </li>
  )
}
