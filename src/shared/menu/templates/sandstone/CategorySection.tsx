import type { ModifierGroup } from '@/entities/menu/menu'
import type { Layout } from '@/entities/theme/theme'
import type { Section } from '../../sections'
import { motion, type useReveal } from '../kit'
import type { TemplateProps } from '../types'
import { plateFirst, plateOf } from './carte'
import { Item } from './Item'
import { Lozenge } from './Ornament'
import styles from './CategorySection.module.css'

type Props = {
  section: Section
  id: string
  layout: Layout
  tags: TemplateProps['tags']
  groups: ModifierGroup[]
  interactive: boolean
  photoOf: TemplateProps['photoOf']
  /** True for the first category: its plate should not wait to scroll into view. */
  first: boolean
  /** The section's entrance as it nears the screen. */
  reveal: ReturnType<typeof useReveal>
}

/** One course of the card: its title in spaced capitals between fine rules, then the items, with one plate at most. */
export function CategorySection({ section, id, layout, tags, groups, interactive, photoOf, first, reveal }: Props) {
  const Title = tags.category
  const plate = plateOf(section.products, photoOf)
  const items = layout === 'grid' ? plateFirst(section.products, plate) : section.products
  return (
    // A landmark on the public page only: in the Design preview it would add the customer's menu to the owner's landmarks.
    <section ref={reveal} id={id} className={first && interactive ? `${styles.section} ${motion.opening} ${motion.afterTwo}` : styles.section} aria-labelledby={interactive ? `${id}-title` : undefined}>
      <div className={styles.head}>
        <span className={styles.rule} aria-hidden="true" />
        <Lozenge />
        <Title id={`${id}-title`} className={styles.title}>
          {section.category.name}
        </Title>
        <Lozenge />
        <span className={styles.rule} aria-hidden="true" />
      </div>
      <ul className={styles.items}>
        {items.map((product) => (
          <Item key={product.id} product={product} as={tags.product} groups={groups} interactive={interactive} plate={product === plate ? photoOf(product) : null} eager={first} />
        ))}
      </ul>
    </section>
  )
}
