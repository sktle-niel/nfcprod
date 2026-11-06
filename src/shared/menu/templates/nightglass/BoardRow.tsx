import { useId, useState } from 'react'
import { copy } from '@/config/copy'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { fill } from '@/shared/lib/fill'
import { Description, SoldOutLabel } from '../../cards/CardParts'
import { soldOutAttr } from '../../cards/cardState'
import { Icon, motion, ProductDetails } from '../kit'
import type { PricePlan } from './columns'
import { RowPrices } from './RowPrices'
import { words } from './words'
import styles from './BoardRow.module.css'

type Props = {
  product: Product
  plan: PricePlan
  /** The tag of the name (`tags.product`). */
  as: 'h3' | 'h4'
  groups: ModifierGroup[]
  interactive: boolean
}

/**
 * One row of the board: the name at the left and the prices in the columns of its category, with the rest of what there is to say
 * lettered small on the line below. Only add-ons, which can be many, open.
 */
export function BoardRow({ product, plan, as: Name, groups, interactive }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const addOns = product.groupIds.some((id) => groups.some((group) => group.id === id))
  const tagged = product.tags.length > 0
  return (
    <li className={styles.row} data-sold-out={soldOutAttr(product)} data-across={plan.columns.length > 1 && product.variants.length > 0 ? '' : undefined}>
      <div className={styles.head}>
        <Name className={styles.name}>{product.name}</Name>
        <SoldOutLabel product={product} className={styles.soldOut} />
      </div>
      <RowPrices product={product} plan={plan} />
      <div className={styles.notes}>
        <Description product={product} className={styles.description} />
        {(tagged || addOns) && (
          <div className={styles.extras}>
            {tagged && <p className={styles.tags}>{product.tags.map((tag) => copy.menu.view.tags[tag]).join(', ')}</p>}
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
          </div>
        )}
      </div>
      {addOns && interactive && (
        // Closed, its stylesheet keeps it from sight and from a screen reader, once it has finished closing.
        <div id={panelId} className={styles.panel} data-open={open ? '' : undefined} aria-hidden={!open}>
          <div className={styles.panelBody}>
            <ProductDetails product={{ ...product, variants: [] }} groups={groups} ground="page" className={styles.details} />
          </div>
        </div>
      )}
    </li>
  )
}
