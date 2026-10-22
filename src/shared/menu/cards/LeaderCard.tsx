import { ProductPhoto } from '../photo/ProductPhoto'
import { AddOnsNote, Description, Price, SoldOutLabel, Tags, VariantList } from './CardParts'
import { soldOutAttr } from './cardState'
import styles from './LeaderCard.module.css'
import type { CardProps } from './types'

/**
 * The price-list line of a retro or bar menu: a small round picture, the name, a dotted leader and the price at the right,
 * then the description and the sizes in small text. It has no card of its own: it sits on the page, so its text is the page
 * text (`--menu-text`, `--menu-muted`). The leader is a dotted border, not characters, so a screen reader reads "Latte, ₱120".
 */
export function LeaderCard({ product, as: Heading, hasAddOns, photo, placeholder }: CardProps) {
  return (
    <li className={styles.item} data-sold-out={soldOutAttr(product)}>
      <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
      <div className={styles.body}>
        <div className={styles.line}>
          <Heading className={styles.name}>
            <span className={styles.nameText}>{product.name}</span>
          </Heading>
          <Price product={product} className={styles.price} />
        </div>
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
      </div>
    </li>
  )
}
