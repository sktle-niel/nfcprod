import { useId, useState } from 'react'
import { copy } from '@/config/copy'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { fill } from '@/shared/lib/fill'
import { Description, PriceAmount, SoldOutLabel, Variants } from '../../cards/CardParts'
import { soldOutAttr } from '../../cards/cardState'
import { Icon, motion, ProductDetails } from '../kit'
import { usePictureFade } from './usePictureFade'
import { words } from './words'
import styles from './Panel.module.css'

type Props = {
  product: Product
  /** The tag of the name (`tags.product`). */
  as: 'h3' | 'h4'
  groups: ModifierGroup[]
  interactive: boolean
  photo: string | null
  /** True for the first pictures of the page: they should not wait to scroll into view. */
  eager: boolean
}

/**
 * One lit panel, one dish: the photo edge to edge in its own color, then the name and sizes with the price under its brass line, then
 * what there is to read. With no photo the name is set large. Sizes are printed; only add-ons, which can be many, open.
 */
export function Panel({ product, as: Heading, groups, interactive, photo, eager }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const fade = usePictureFade(interactive)
  const addOns = product.groupIds.some((id) => groups.some((group) => group.id === id))
  const body = product.description !== '' || product.tags.length > 0 || addOns
  return (
    <li className={styles.panel} data-sold-out={soldOutAttr(product)} data-photo={photo === null ? undefined : ''}>
      {photo !== null && (
        <span className={styles.photo}>
          <img ref={fade} src={photo} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
        </span>
      )}
      <div className={styles.strip}>
        <div className={styles.words}>
          <Heading className={styles.name}>{product.name}</Heading>
          <Variants product={product} className={styles.sizes} />
          <SoldOutLabel product={product} className={styles.soldOut} />
        </div>
        <PriceAmount product={product} className={styles.price} />
      </div>
      {body && (
        <div className={styles.body}>
          <Description product={product} className={styles.description} />
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
                className={`${styles.more} ${motion.press}`}
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
            <div id={panelId} className={styles.addOns} data-open={open ? '' : undefined}>
              <div className={styles.addOnsInner}>
                <ProductDetails product={{ ...product, variants: [] }} groups={groups} ground="page" />
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
