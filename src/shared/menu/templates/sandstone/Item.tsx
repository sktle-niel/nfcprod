import { useId, useState } from 'react'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { fill } from '@/shared/lib/fill'
import { Description, SoldOutLabel, Tags } from '../../cards/CardParts'
import { soldOutAttr } from '../../cards/cardState'
import { Icon, motion, ProductDetails } from '../kit'
import { Prices } from './Prices'
import { words } from './words'
import styles from './Item.module.css'

type Props = {
  product: Product
  /** The tag of the name (`tags.product`). */
  as: 'h3' | 'h4'
  groups: ModifierGroup[]
  interactive: boolean
  /** The picture of this item when it is the plate of its category, else null: most items are pure type. */
  plate: string | null
  eager: boolean
}

/**
 * Holds a picture still decoding at nothing, so it fades in over the paper. Visible by default: a picture already there, a script
 * that never runs and a picture that fails are all left alone, and the box has its shape from the start, so nothing shifts.
 */
function fadeIn(image: HTMLImageElement | null) {
  if (image === null || image.complete) return undefined
  const done = () => image.removeAttribute('data-decoding')
  image.setAttribute('data-decoding', '')
  image.addEventListener('load', done, { once: true })
  image.addEventListener('error', done, { once: true })
  return () => {
    done()
    image.removeEventListener('load', done)
    image.removeEventListener('error', done)
  }
}

/**
 * One entry of the card, set on the center line: the name, under it the price or the sizes, then the description in italic. Nothing
 * is cut short. Only the add-ons, which can be many, open under a text link; closed, they are out of reach of a screen reader too.
 */
export function Item({ product, as: Heading, groups, interactive, plate, eager }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const addOns = product.groupIds.some((id) => groups.some((group) => group.id === id))
  return (
    <li className={styles.item} data-sold-out={soldOutAttr(product)} data-plate={plate === null ? undefined : ''}>
      {plate !== null && (
        <span className={styles.plate}>
          <img ref={interactive ? fadeIn : undefined} src={plate} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
        </span>
      )}
      <Heading className={styles.name}>{product.name}</Heading>
      <Prices product={product} />
      <SoldOutLabel product={product} className={styles.soldOut} />
      <Description product={product} className={styles.description} />
      <Tags product={product} className={styles.tags} />
      {addOns &&
        (interactive ? (
          <button type="button" className={`${styles.more} ${motion.press}`} aria-expanded={open} aria-controls={panelId} aria-label={fill(words.addOnsOf, { name: product.name })} onClick={() => setOpen((now) => !now)}>
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
        <div id={panelId} className={styles.panel} data-open={open ? '' : undefined} inert={!open}>
          <div className={styles.panelBody}>
            <ProductDetails product={{ ...product, variants: [] }} groups={groups} ground="page" className={styles.details} />
          </div>
        </div>
      )}
    </li>
  )
}
