import { useEffect } from 'react'
import { hasVisit, motion, useReveal, VisitSection } from '../kit'
import type { TemplateProps } from '../types'
import { CategoryStrip } from './CategoryStrip'
import { Opening } from './Opening'
import { Panel } from './Panel'
import { useReadingSection } from './useReadingSection'
import styles from './Template.module.css'
import visit from './Visit.module.css'

/** How many pictures of the page load at once: the ones on or just under the first screen. */
const EAGER_PICTURES = 4

/**
 * Lightbox: a calm gallery of the food. A warm wall holds a run of lit panels, each one a dish: the photo edge to edge in its own color,
 * and under it the name and the price on a quiet brass line. The photos are the point, so nothing lies over them and nothing tones them.
 * A dish with no photo is a panel of type. Before the panels stand the shop's name and tagline; after them, a closing panel with how to
 * visit. The owner's page photo shows only behind that last part.
 */
export function Template({ business, sections, groups, layout, tags, interactive, idOf, photoOf }: TemplateProps) {
  const active = useReadingSection(
    sections.map((_, index) => idOf(index)),
    interactive,
  )
  const reveal = useReveal(interactive)
  const Category = tags.category
  const before = (position: number) => sections.slice(0, position).reduce((total, { products }) => total + products.length, 0)
  const visitable = hasVisit(business)
  const visitId = `${idOf(0)}-visit`
  // The kit's section takes no ref. The hold goes on the section itself, so a link to it finds it and settles it.
  useEffect(() => (visitable ? reveal(document.getElementById(visitId)) : undefined), [reveal, visitable, visitId])
  const arrival = interactive ? `${motion.opening} ${motion.afterTwo}` : ''

  return (
    <div className={styles.page} data-layout={layout} data-mode={business.theme.mode}>
      <div className={styles.fixture}>
        <Opening business={business} as={tags.name} menuId={idOf(0)} visitId={visitable ? visitId : null} interactive={interactive} />
        <CategoryStrip links={sections.map(({ category }, index) => ({ key: category.id, id: idOf(index), name: category.name }))} active={active} interactive={interactive} className={arrival} />
        {sections.map(({ category, products }, index) => (
          <section
            key={category.id}
            id={idOf(index)}
            // The first section is part of the opening; the others ease in as they arrive.
            ref={index === 0 ? undefined : reveal}
            className={`${styles.section} ${index === 0 ? arrival : ''}`}
            // A landmark on the public page only: in the Design preview it would add the customer's menu to the owner's landmarks.
            aria-labelledby={interactive ? `${idOf(index)}-title` : undefined}
          >
            <Category id={`${idOf(index)}-title`} className={styles.title}>
              {category.name}
            </Category>
            <ul className={styles.list}>
              {products.map((product, at) => (
                <Panel key={product.id} product={product} as={tags.product} groups={groups} interactive={interactive} photo={photoOf(product)} eager={before(index) + at < EAGER_PICTURES} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <VisitSection
        business={business}
        interactive={interactive}
        id={visitId}
        headingTag={tags.category}
        classNames={{ root: visit.root, heading: visit.heading, facts: visit.facts, fact: visit.fact, label: visit.label, value: visit.value, link: visit.link, social: visit.social }}
      />
    </div>
  )
}
