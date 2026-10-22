import { ProductPhoto } from '../photo/ProductPhoto'
import { AddOnsNote, Description, Price, SoldOutLabel, Tags, Variants } from './CardParts'
import { soldOutAttr } from './cardState'
import styles from './TileCard.module.css'
import type { CardProps } from './types'

/**
 * The tile of a digital menu or a product catalog: the picture on top, the name, the sizes in small text, two lines of
 * description, and the price in a filled chip at the foot. Two or three side by side in the grid layout, one per line (picture
 * on the left) in the list layout. The whole description stays in the page: only its drawing is cut to two lines.
 */
export function TileCard({ product, as: Heading, hasAddOns, photo, placeholder }: CardProps) {
  return (
    <li className={styles.tile} data-sold-out={soldOutAttr(product)}>
      <div className={styles.stage}>
        <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
      </div>
      <div className={styles.body}>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Heading className={styles.name}>{product.name}</Heading>
        <Variants product={product} className={styles.variants} />
        <Description product={product} className={styles.description} />
        <Tags product={product} className={styles.tags} tagClassName={styles.tag} />
        <AddOnsNote show={hasAddOns} className={styles.addOns} />
        <Price product={product} className={styles.price} />
      </div>
    </li>
  )
}
