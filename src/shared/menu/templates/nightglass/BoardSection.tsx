import type { CSSProperties } from 'react'
import type { ModifierGroup } from '@/entities/menu/menu'
import type { Section } from '../../sections'
import type { TemplateProps } from '../types'
import { BoardRow } from './BoardRow'
import { pricePlan } from './columns'
import { PinnedPrint } from './PinnedPrint'
import styles from './BoardSection.module.css'

type Props = {
  section: Section
  id: string
  /** The picture pinned to this category, or null: the header then stands alone. */
  pin: string | null
  /** True for the first category: its picture is on the first screen and should not wait. */
  first: boolean
  groups: ModifierGroup[]
  tags: TemplateProps['tags']
  interactive: boolean
  /** The section's one entrance as it arrives: `useReveal`'s ref. */
  reveal: (element: HTMLElement | null) => (() => void) | undefined
}

/** One category of the board: its lettered header, the size names over the price columns, and the rows under them. */
export function BoardSection({ section: { category, products }, id, pin, first, groups, tags, interactive, reveal }: Props) {
  const Title = tags.category
  const plan = pricePlan(products)
  const measures = { '--tpl-columns': Math.max(plan.columns.length, 1), '--tpl-cell': plan.cell } as CSSProperties
  return (
    // A landmark on the public page only: in the Design preview it would add the customer's menu to the owner's landmarks.
    <section
      ref={reveal}
      id={id}
      className={styles.section}
      style={measures}
      aria-labelledby={interactive ? `${id}-title` : undefined}
      data-stacked={plan.stacked ? '' : undefined}
      data-tight={plan.tight ? '' : undefined}
    >
      <div className={styles.header}>
        <Title id={`${id}-title`} className={styles.title}>
          {category.name}
        </Title>
        {pin !== null && <PinnedPrint src={pin} eager={first} interactive={interactive} />}
      </div>
      {plan.columns.length > 0 && (
        // The size is said again in each price, so a screen reader does not need the heads.
        <div className={styles.heads} aria-hidden="true">
          {plan.columns.map((column, index) => (
            <span key={column} style={{ gridColumnStart: index + 2 }}>
              {column}
            </span>
          ))}
        </div>
      )}
      <ul className={styles.rows}>
        {products.map((product) => (
          <BoardRow key={product.id} product={product} plan={plan} as={tags.product} groups={groups} interactive={interactive} />
        ))}
      </ul>
    </section>
  )
}
