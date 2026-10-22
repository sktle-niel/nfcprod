import { ProductPhoto } from '../photo/ProductPhoto'
import { AddOnsNote, Description, Price, SoldOutLabel, Tags, Variants } from './CardParts'
import { soldOutAttr } from './cardState'
import styles from './PlateCard.module.css'
import type { CardProps } from './types'

/** "01", "02" ... "12": the dish number as a fine-dining menu prints it. */
const plateNumber = (number: number): string => String(Math.max(1, Math.trunc(number))).padStart(2, '0')

/**
 * The fine-dining card: a numbered dish. A round plate picture (always a circle, whatever the picture shape of the look) with
 * a soft ring and a small number badge, then the name in the display font with the price at the right, a thin rule and the
 * description. No card color: it is drawn on the page, so its text uses the page pair (`--menu-text`, `--menu-muted`).
 * The number is decoration (the list already tells its place), so it is hidden from screen readers.
 */
export function PlateCard({ product, as: Heading, hasAddOns, photo, placeholder, number }: CardProps) {
  return (
    <li className={styles.card} data-sold-out={soldOutAttr(product)}>
      <div className={styles.plate}>
        <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
        <span className={styles.number} aria-hidden="true">
          {plateNumber(number)}
        </span>
      </div>
      <div className={styles.body}>
        <div className={styles.head}>
          <Heading className={styles.name}>{product.name}</Heading>
          <Price product={product} className={styles.price} />
        </div>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Description product={product} className={styles.description} />
        <Variants product={product} className={styles.variants} />
        <Tags product={product} className={styles.tags} tagClassName={styles.tag} />
        <AddOnsNote show={hasAddOns} className={styles.addOns} />
      </div>
    </li>
  )
}
