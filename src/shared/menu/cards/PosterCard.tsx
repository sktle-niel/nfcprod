import { ProductPhoto } from '../photo/ProductPhoto'
import { AddOnsNote, Description, Price, SoldOutLabel, Tags, VariantList } from './CardParts'
import { soldOutAttr } from './cardState'
import styles from './PosterCard.module.css'
import type { CardProps } from './types'

/**
 * The poster-board card: no card color, the picture (made for cut-outs) on the left leaning a little over the margin, and
 * beside it the name in bold display capitals with the sizes as a small table of label and price. A product with sizes
 * shows the table instead of a "From" line; a product without sizes shows its price. Drawn on the page, so its text is
 * `--menu-text` and `--menu-muted`.
 */
export function PosterCard({ product, as: Heading, hasAddOns, photo, placeholder }: CardProps) {
  const hasSizes = product.variants.length > 0
  return (
    <li className={styles.card} data-sold-out={soldOutAttr(product)}>
      <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
      <div className={styles.body}>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Heading className={styles.name}>{product.name}</Heading>
        <Description product={product} className={styles.description} />
        {hasSizes ? (
          <VariantList
            product={product}
            className={styles.sizes}
            itemClassName={styles.size}
            labelClassName={styles.sizeLabel}
            priceClassName={styles.sizePrice}
          />
        ) : (
          <Price product={product} className={styles.price} />
        )}
        <Tags product={product} className={styles.tags} tagClassName={styles.tag} />
        <AddOnsNote show={hasAddOns} className={styles.addOns} />
      </div>
    </li>
  )
}
