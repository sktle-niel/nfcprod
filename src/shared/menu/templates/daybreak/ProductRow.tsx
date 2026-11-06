import { useId, useState } from 'react'
import { copy } from '@/config/copy'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { fill } from '@/shared/lib/fill'
import { Description, PriceAmount, SoldOutLabel, Variants } from '../../cards/CardParts'
import { soldOutAttr } from '../../cards/cardState'
import { Icon, motion, ProductDetails } from '../kit'
import { joined } from './classes'
import { words } from './words'
import styles from './ProductRow.module.css'

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

/**
 * One line of the menu: the name, dotted leaders across the whole column to the price, and under them all there is to read, with the
 * picture beside it. So the prices stand in one line down the right margin, as on a printed menu. Nothing is cut short. A row with no
 * picture is simply a row of type. Sizes are printed; only add-ons, which can be many, open under a text link.
 */
export function ProductRow({ product, as: Heading, groups, interactive, photo, eager }: Props) {
  const [open, setOpen] = useState(false)
  const [decoded, setDecoded] = useState(false)
  const panelId = useId()
  const addOns = product.groupIds.some((id) => groups.some((group) => group.id === id))
  return (
    <li className={styles.row} data-sold-out={soldOutAttr(product)} data-photo={photo === null ? undefined : ''}>
      <div className={styles.head}>
        <Heading className={styles.name}>{product.name}</Heading>
        <span className={styles.leader} aria-hidden="true" />
        <PriceAmount product={product} className={styles.price} />
      </div>
      <div className={styles.body}>
        <div className={styles.text}>
          <SoldOutLabel product={product} className={styles.soldOut} />
          <Description product={product} className={styles.description} />
          <Variants product={product} className={styles.sizes} />
          {product.tags.length > 0 && (
            <ul className={styles.tags}>
              {product.tags.map((tag) => (
                <li key={tag}>
                  {tag === 'bestSeller' && <Icon name="star" className={styles.star} />}
                  {copy.menu.view.tags[tag]}
                </li>
              ))}
            </ul>
          )}
          {addOns &&
            (interactive ? (
              <button
                type="button"
                className={joined(styles.more, motion.press)}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={fill(words.addOnsOf, { name: product.name })}
                onClick={() => setOpen((now) => !now)}
              >
                {words.addOns}
                <Icon name="chevronDown" className={styles.chevron} />
              </button>
            ) : (
              <span className={styles.more}>
                {words.addOns}
                <Icon name="chevronDown" />
              </span>
            ))}
          {addOns && interactive && (
            // Opens by its height through the grid rows; closed, it is out of the tab order and away from a screen reader.
            <div id={panelId} className={styles.panel} data-open={open ? '' : undefined} inert={!open}>
              <div className={styles.panelBody}>
                <ProductDetails product={{ ...product, variants: [] }} groups={groups} ground="page" />
              </div>
            </div>
          )}
        </div>
        {photo !== null && (
          <span className={styles.photo}>
            {/* On the public page a picture fades in as it decodes; the box holds its place, so nothing shifts. */}
            <img
              className={interactive ? styles.fades : undefined}
              data-decoded={decoded ? '' : undefined}
              src={photo}
              alt=""
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => setDecoded(true)}
              onError={() => setDecoded(true)}
            />
          </span>
        )}
      </div>
    </li>
  )
}
