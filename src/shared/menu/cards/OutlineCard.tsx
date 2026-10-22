import { ProductPhoto } from '../photo/ProductPhoto'
import { AddOnsNote, Description, Price, SoldOutLabel, Tags, VariantList } from './CardParts'
import { soldOutAttr } from './cardState'
import styles from './OutlineCard.module.css'
import type { CardProps } from './types'

/**
 * The "outline" card (Atelier): a wide rounded card drawn only as an outline on the page, so its text is the page's. On the
 * left the name in bold capitals, the description, the sizes as small pills and the price in a filled pill; on the right the
 * picture, which reaches a little past the card's edge.
 */
export function OutlineCard({ product, as: Heading, hasAddOns, photo, placeholder }: CardProps) {
  return (
    <li className={styles.card} data-sold-out={soldOutAttr(product)}>
      <div className={styles.body}>
        <Heading className={styles.name}>{product.name}</Heading>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Description product={product} className={styles.description} />
        <VariantList
          product={product}
          className={styles.sizes}
          itemClassName={styles.size}
          labelClassName={styles.sizeLabel}
          priceClassName={styles.sizePrice}
        />
        <Tags product={product} className={styles.tags} tagClassName={styles.tag} />
        <AddOnsNote show={hasAddOns} className={styles.addOns} />
        <Price product={product} className={styles.price} />
      </div>
      <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
    </li>
  )
}
