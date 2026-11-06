import type { CSSProperties } from 'react'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { fill } from '@/shared/lib/fill'
import { Description, Price, SoldOutLabel, Tags, Variants } from '../../cards/CardParts'
import { soldOutAttr } from '../../cards/cardState'
import { AddOns } from './AddOns'
import { cellsOf } from './columns'
import { words } from './words'
import styles from './Row.module.css'

type Props = {
  product: Product
  as: 'h3' | 'h4'
  /** The size columns of the category: empty for a plain list. */
  labels: string[]
  /** The add-ons this item alone offers: the ones of its whole category are printed under the list. */
  groups: ModifierGroup[]
  interactive: boolean
}

/** The prices of a row under the size columns. A size the item does not come in leaves its place empty. */
function Cells({ cells }: { cells: ReturnType<typeof cellsOf> }) {
  return cells.map((cell, index) =>
    cell === null ? (
      <span key={index} />
    ) : (
      <p key={index} className={styles.price}>
        {cell.label !== null && <span className={styles.spoken}>{cell.label} </span>}
        {cell.amount}
      </p>
    ),
  )
}

/**
 * One line of the price list: the name, a fine leader, the prices. Under it the rest runs on as one small paragraph, tag, description
 * and the add-ons link, the way a printed list saves its lines. A sold-out item says so in words, where its prices were.
 */
export function Row({ product, as: Heading, labels, groups, interactive }: Props) {
  const columned = labels.length > 0
  const cells = columned && product.available ? cellsOf(product, labels) : []
  // The leader runs on through the columns this item has no price in, up to its first.
  const empty = Math.max(0, cells.findIndex((cell) => cell !== null))
  const lead: CSSProperties | undefined = empty > 0 ? { gridColumn: `span ${empty + 1}` } : undefined
  return (
    <li className={styles.row} data-sold-out={soldOutAttr(product)}>
      <div className={styles.line} data-columns={columned ? '' : undefined}>
        <div className={styles.lead} style={lead}>
          <Heading className={styles.name}>{product.name}</Heading>
          <span className={styles.leader} aria-hidden="true" />
        </div>
        {!product.available ? <SoldOutLabel product={product} className={styles.soldOut} /> : columned ? <Cells cells={cells.slice(empty)} /> : <Price product={product} className={styles.price} />}
      </div>
      <div className={styles.more}>
        <Tags product={product} className={styles.tags} tagClassName={styles.tag} />
        <Description product={product} className={styles.description} />
        {!columned && <Variants product={product} className={styles.sizes} />}
        <AddOns product={product} groups={groups} label={words.addOns} spoken={fill(words.addOnsOf, { name: product.name })} interactive={interactive} />
      </div>
    </li>
  )
}
