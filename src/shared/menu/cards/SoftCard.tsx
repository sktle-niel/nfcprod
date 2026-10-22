import { ProductPhoto } from '../photo/ProductPhoto'
import { AddOnsNote, Description, Price, SoldOutLabel, Tags, Variants } from './CardParts'
import { soldOutAttr } from './cardState'
import styles from './SoftCard.module.css'
import type { CardProps } from './types'

/**
 * The "soft" card (Cocoa): a lifted card in the card color with large round corners. The name is big, bold and in
 * capitals, the description is a quiet subtitle, and the picture overlaps the right side and the card's edge with a small
 * tilted price tag on it. Its text is drawn on the card color (`--menu-on-surface`).
 */
export function SoftCard({ product, as: Heading, hasAddOns, photo, placeholder }: CardProps) {
  return (
    <li className={styles.card} data-sold-out={soldOutAttr(product)}>
      <div className={styles.body}>
        <Heading className={styles.name}>{product.name}</Heading>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Description product={product} className={styles.description} />
        <Variants product={product} className={styles.variants} />
        <Tags product={product} className={styles.tags} tagClassName={styles.tag} />
        <AddOnsNote show={hasAddOns} className={styles.addOns} />
      </div>
      <div className={styles.visual}>
        <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
        <Price product={product} className={styles.price} />
      </div>
    </li>
  )
}
