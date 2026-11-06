import { useCallback } from 'react'
import { copy } from '@/config/copy'
import { fill } from '@/shared/lib/fill'
import { hasVisit, motion, useMenuSearch, useReveal, VisitSection } from '../kit'
import type { TemplateProps } from '../types'
import { CategoryStrip } from './CategoryStrip'
import { joined } from './classes'
import { Masthead } from './Masthead'
import { ProductRow } from './ProductRow'
import { SearchField } from './SearchField'
import { SiteNav } from './SiteNav'
import { useReadingSection } from './useReadingSection'
import styles from './Template.module.css'
import visit from './Visit.module.css'

const none = copy.menu.view.template.search.none

/**
 * Daybreak: a paper placemat. Everything on the sheet is printed in one coffee ink, the words, the rules and the pictures, inside a
 * fine double ruled frame. The name of the shop is set large and quiet, and under it the menu starts at once, item by item with
 * dotted leaders to the price, the way a printed menu is read. The sheet closes on a block of solid ink with the way to the shop.
 * One ink is also what makes a phone photo at home here: every picture comes out in the same two tones, whatever its light was.
 */
export function Template({ business, sections, groups, layout, tags, interactive, idOf, photoOf }: TemplateProps) {
  const search = useMenuSearch(sections)
  // A category keeps the position it has in the whole menu, so its id stays the same while a search hides the others.
  const shown = search.shown.map((section) => ({ ...section, index: sections.findIndex(({ category }) => category.id === section.category.id) }))
  const active = useReadingSection(
    shown.map(({ index }) => idOf(index)),
    interactive,
  )
  const reveal = useReveal(interactive)
  // The entrance goes on the section itself, the target of the Visit link, so a jump to it settles the entrance before it measures.
  const revealVisit = useCallback((box: HTMLElement | null) => reveal(box?.firstElementChild instanceof HTMLElement ? box.firstElementChild : null), [reveal])
  const Category = tags.category
  const menuId = `${idOf(0)}-menu`
  const visitId = `${idOf(0)}-visit`
  // The last step of the one composed moment of the page, after the name and the tagline. Never in the preview.
  const lastStep = interactive ? joined(motion.opening, motion.afterTwo) : undefined

  return (
    <div className={styles.page} data-layout={layout} data-mode={business.theme.mode}>
      <div className={styles.sheet}>
        {hasVisit(business) && <SiteNav menuId={menuId} visitId={visitId} interactive={interactive} />}
        <Masthead business={business} as={tags.name} interactive={interactive} />
        <CategoryStrip
          links={shown.map(({ category, index }) => ({ key: category.id, id: idOf(index), name: category.name }))}
          active={active}
          interactive={interactive}
          className={lastStep}
        />
        <div id={menuId} className={styles.menu}>
          <SearchField search={search} interactive={interactive} className={lastStep} />
          {shown.length === 0 ? (
            <p className={styles.none}>{fill(none, { query: search.query.trim() })}</p>
          ) : (
            <div className={joined(styles.sections, lastStep)}>
              {shown.map(({ category, products, index }, position) => (
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
                  <ul className={styles.list}>
                    {products.map((product, at) => (
                      <ProductRow key={product.id} product={product} as={tags.product} groups={groups} interactive={interactive} photo={photoOf(product)} eager={position === 0 && at < 4} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        <div ref={revealVisit} className={styles.closing}>
          <VisitSection
            business={business}
            interactive={interactive}
            id={visitId}
            headingTag={tags.category}
            classNames={{ root: visit.root, heading: visit.heading, facts: visit.facts, fact: visit.fact, label: visit.label, value: visit.value, link: visit.link, social: visit.social }}
          />
        </div>
      </div>
    </div>
  )
}
