import { useCallback } from 'react'
import { hasVisit, useReveal, VisitSection } from '../kit'
import type { TemplateProps } from '../types'
import { CategoryLabels } from './CategoryLabels'
import { ProductRow } from './ProductRow'
import { SiteFold } from './SiteFold'
import { Stamp } from './Stamp'
import { TornEdge } from './TornEdge'
import { useReadingSection } from './useReadingSection'
import styles from './Template.module.css'

/**
 * Beanhouse: the kraft bag of a good roaster, the website of the shop that fills it. The page is the bag. Its folded, stitched top
 * carries the links, a fine seal set from the shop's name stands under it, the menu is cream paper labels with a deckled edge pasted
 * on one for each category, and the foot of the bag holds the visit details, printed in reverse.
 */
export function Template({ business, sections, groups, layout, tags, interactive, idOf, photoOf }: TemplateProps) {
  const active = useReadingSection(
    sections.map((_, index) => idOf(index)),
    interactive,
  )
  const reveal = useReveal(interactive)
  // VisitSection takes no ref, and the Visit link settles the element it targets: the hold goes on the section inside this box.
  const revealVisit = useCallback((box: HTMLElement | null) => reveal(box?.firstElementChild instanceof HTMLElement ? box.firstElementChild : null), [reveal])
  const Category = tags.category
  const menuId = `${idOf(0)}-menu`
  const visitId = `${idOf(0)}-visit`
  const showVisit = hasVisit(business)

  return (
    <div className={styles.page} data-layout={layout} data-mode={business.theme.mode}>
      <SiteFold menuId={menuId} visitId={showVisit ? visitId : null} interactive={interactive} />
      <Stamp business={business} as={tags.name} interactive={interactive} />
      <div id={menuId} className={styles.menu}>
        <CategoryLabels links={sections.map(({ category }, index) => ({ key: category.id, id: idOf(index), name: category.name }))} active={active} interactive={interactive} />
        <div className={styles.sections}>
          {sections.map(({ category, products }, index) => (
            <section
              key={category.id}
              ref={reveal}
              id={idOf(index)}
              className={styles.section}
              // A landmark on the public page only: in the Design preview it would add the customer's menu to the owner's landmarks.
              aria-labelledby={interactive ? `${idOf(index)}-title` : undefined}
            >
              <Category id={`${idOf(index)}-title`} className={styles.title}>
                {category.name}
              </Category>
              <div className={styles.label}>
                <TornEdge place="top" flipped={index % 2 === 1} />
                <ul className={styles.list}>
                  {products.map((product, at) => (
                    <ProductRow key={product.id} product={product} as={tags.product} groups={groups} interactive={interactive} layout={layout} photo={photoOf(product)} eager={index === 0 && at < 4} />
                  ))}
                </ul>
                <TornEdge place="bottom" flipped={index % 2 === 0} />
              </div>
            </section>
          ))}
        </div>
      </div>
      <div ref={revealVisit}>
        <VisitSection
          business={business}
          interactive={interactive}
          id={visitId}
          headingTag={tags.category}
          classNames={{ root: styles.visit, heading: styles.visitHeading, facts: styles.visitFacts, fact: styles.visitFact, label: styles.visitLabel, value: styles.visitValue, link: styles.visitLink, social: styles.visitSocial }}
        />
      </div>
    </div>
  )
}
