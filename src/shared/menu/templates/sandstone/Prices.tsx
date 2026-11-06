import type { Product } from '@/entities/menu/menu'
import { formatPeso } from '@/shared/lib/money'
import styles from './Item.module.css'

/**
 * A price with its peso sign set a little smaller: few fonts have the sign, so a phone borrows it from another face, heavier and
 * wider than the figures beside it. Smaller, it sits with them.
 */
function Amount({ centavos }: { centavos: number }) {
  const text = formatPeso(centavos)
  const figures = text.search(/\d/)
  return (
    <>
      <span className={styles.sign}>{text.slice(0, figures)}</span>
      {text.slice(figures)}
    </>
  )
}

/** The price line of an item, on its own under the name so the eye finds prices down one center line: the one price, or each size kept whole. */
export function Prices({ product }: { product: Product }) {
  if (product.variants.length === 0) {
    return (
      <p className={styles.price}>
        <Amount centavos={product.price} />
      </p>
    )
  }
  return (
    <ul className={`${styles.price} ${styles.sizes}`}>
      {product.variants.map((variant) => (
        <li key={variant.id} className={styles.size}>
          <span className={styles.sizeLabel}>{variant.label}</span> <Amount centavos={variant.price} />
        </li>
      ))}
    </ul>
  )
}
