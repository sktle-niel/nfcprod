import type { CSSProperties } from 'react'
import { fill } from '@/shared/lib/fill'
import type { useReveal } from '../kit'
import type { TemplateProps } from '../types'
import { AddOns } from './AddOns'
import { columnsOf } from './columns'
import { groupsOf, sharedGroups } from './groups'
import { Row } from './Row'
import { words } from './words'
import styles from './Section.module.css'

type Props = Pick<TemplateProps, 'groups' | 'tags' | 'interactive' | 'idOf'> & {
  section: TemplateProps['sections'][number]
  index: number
  /** The entrance of the section as it nears the screen. */
  reveal: ReturnType<typeof useReveal>
}

/**
 * One category: its name in script on a fine rule, with the size columns at the end of the rule when it has them, and its list. The
 * column heads are hidden from screen readers: each price says its own size. Add-ons every item has are printed once, under the list.
 */
export function Section({ section, index, groups, tags, interactive, idOf, reveal }: Props) {
  const Category = tags.category
  const { category, products } = section
  const titleId = `${idOf(index)}-title`
  const { labels, chars } = columnsOf(products)
  const columned = labels.length > 0
  const shared = sharedGroups(products, groups)
  const first = products[0]
  const vars = columned ? ({ '--tpl-cols': labels.length, '--tpl-chars': chars } as CSSProperties) : undefined
  return (
    // A landmark on the public page only: in the Design preview it would add the customer's menu to the owner's landmarks.
    <section ref={reveal} id={idOf(index)} className={styles.section} style={vars} aria-labelledby={interactive ? titleId : undefined}>
      <div className={styles.head} data-columns={columned ? '' : undefined}>
        <Category id={titleId} className={styles.title}>
          {category.name}
        </Category>
        {labels.map((label) => (
          <span key={label} className={styles.label} aria-hidden="true">
            {label}
          </span>
        ))}
      </div>
      <ul className={styles.rows}>
        {products.map((product) => (
          <Row key={product.id} product={product} as={tags.product} labels={labels} groups={groupsOf(product, groups).filter((group) => !shared.includes(group))} interactive={interactive} />
        ))}
      </ul>
      {first !== undefined && shared.length > 0 && (
        <div className={styles.shared}>
          <AddOns product={first} groups={shared} label={fill(words.addOnsOf, { name: category.name })} interactive={interactive} />
        </div>
      )}
    </section>
  )
}
