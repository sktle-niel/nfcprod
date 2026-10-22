import { ProductPhoto } from '../photo/ProductPhoto'
import { AddOnsNote, Description, Price, SoldOutLabel, Tags, Variants } from './CardParts'
import { soldOutAttr } from './cardState'
import styles from './RowCard.module.css'
import type { CardProps } from './types'

/**
 * The Classic card. In the grid layout it is a vertical card with the picture on top; in the list layout it is a row with
 * a small picture on the right. Its text is drawn on the card color (`--menu-on-surface`).
 */
export function RowCard({ product, as: Heading, hasAddOns, photo, placeholder }: CardProps) {
  return (
    <li className={styles.card} data-sold-out={soldOutAttr(product)}>
      <div className={styles.body}>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Heading className={styles.name}>{product.name}</Heading>
        <Description product={product} className={styles.description} />
        <Price product={product} className={styles.price} />
        <Variants product={product} className={styles.variants} />
        <Tags product={product} className={styles.tags} tagClassName={styles.tag} />
        <AddOnsNote show={hasAddOns} className={styles.addOns} />
      </div>
      <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
    </li>
  )
}
