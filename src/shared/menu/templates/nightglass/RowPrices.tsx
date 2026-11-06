import type { Product } from '@/entities/menu/menu'
import { formatPeso } from '@/shared/lib/money'
import { PriceAmount } from '../../cards/CardParts'
import { columnOf, type PricePlan } from './columns'
import styles from './BoardRow.module.css'

type Props = { product: Product; plan: PricePlan }

/**
 * The prices of a row. Each size stands in the column of its name, and a product with no sizes prints its price in the last column.
 * A category that cannot go across stacks each size with its name down the last column. Across, the name of the size stays in the
 * markup for a screen reader, and the eye reads it from the head of the column.
 */
export function RowPrices({ product, plan }: Props) {
  if (product.variants.length === 0) return <PriceAmount product={product} className={styles.price} />
  if (plan.stacked) {
    return (
      <dl className={styles.stack}>
        {product.variants.map((variant) => (
          <div key={variant.id}>
            <dt>{variant.label}</dt>
            <dd className={styles.price}>{formatPeso(variant.price)}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <dl className={styles.cells}>
      {product.variants.map((variant) => (
        <div key={variant.id} style={{ gridColumnStart: columnOf(plan.columns, variant.label) + 2 }}>
          <dt className={styles.sizeName}>{variant.label}</dt>
          <dd className={styles.price}>{formatPeso(variant.price)}</dd>
        </div>
      ))}
    </dl>
  )
}
