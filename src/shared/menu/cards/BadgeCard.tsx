import { ProductPhoto } from '../photo/ProductPhoto'
import { AddOnsNote, Description, PriceAmount, SoldOutLabel, Tags, Variants } from './CardParts'
import { soldOutAttr } from './cardState'
import styles from './BadgeCard.module.css'
import type { CardProps } from './types'

/**
 * The "badge" card (Sunny, Diner): a centered column on the page itself, no card behind it. The picture stands on a soft
 * pedestal of the accent, a round price badge sits on its top right, and the name is centered under it. The sizes, when the
 * product has them, say what the bare number on the badge starts from.
 *
 * The text comes first in the document (the name is what a screen reader lands on); the stylesheet lifts the picture above it.
 */
export function BadgeCard({ product, as: Heading, hasAddOns, photo, placeholder }: CardProps) {
  return (
    <li className={styles.card} data-sold-out={soldOutAttr(product)}>
      <div className={styles.body}>
        <Heading className={styles.name}>{product.name}</Heading>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Variants product={product} className={styles.variants} />
        <Description product={product} className={styles.description} />
        <Tags product={product} className={styles.tags} tagClassName={styles.tag} />
        <AddOnsNote show={hasAddOns} className={styles.addOns} />
      </div>
      <div className={styles.stage}>
        <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
        <PriceAmount product={product} className={styles.badge} />
      </div>
    </li>
  )
}
