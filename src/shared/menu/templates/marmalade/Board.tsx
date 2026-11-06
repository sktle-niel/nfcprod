import type { ModifierGroup } from '@/entities/menu/menu'
import type { Section } from '../../sections'
import type { TemplateProps } from '../types'
import { Row } from './Row'
import { SwelledRule } from './SwelledRule'
import styles from './Board.module.css'

type Props = {
  section: Section
  id: string
  groups: ModifierGroup[]
  tags: TemplateProps['tags']
  interactive: boolean
  photoOf: TemplateProps['photoOf']
  /** True for the first board on the page: its first pictures should not wait to scroll into view. */
  first: boolean
  /** Eases the section in as it arrives (`useReveal`). */
  reveal: (element: HTMLElement | null) => (() => void) | undefined
}

/** One category: its name lettered on the wall over a swelled rule, and the list under it. */
export function Board({ section: { category, products }, id, groups, tags, interactive, photoOf, first, reveal }: Props) {
  const Title = tags.category
  return (
    // A landmark on the public page only: in the Design preview it would add the customer's menu to the owner's landmarks.
    <section ref={reveal} id={id} className={styles.section} aria-labelledby={interactive ? `${id}-title` : undefined}>
      <Title id={`${id}-title`} className={styles.title}>
        {category.name}
      </Title>
      <SwelledRule className={styles.rule} />
      <ul className={styles.list}>
        {products.map((product, at) => (
          <Row key={product.id} product={product} as={tags.product} groups={groups} interactive={interactive} photo={photoOf(product)} eager={first && at < 4} />
        ))}
      </ul>
    </section>
  )
}
