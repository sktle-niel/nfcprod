import { useLayoutEffect } from 'react'
import { hasVisit, useReveal, VisitSection, type VisitClassNames } from '../kit'
import type { TemplateProps } from '../types'
import { Board } from './Board'
import { Masthead } from './Masthead'
import { Tabs } from './Tabs'
import { useReadingBoard } from './useReadingBoard'
import frame from './Frame.module.css'
import visit from './Visit.module.css'
import styles from './Template.module.css'

const VISIT_CLASSES: VisitClassNames = {
  root: `${frame.ground} ${frame.lined} ${visit.root}`,
  heading: visit.heading,
  facts: visit.facts,
  fact: visit.fact,
  label: visit.label,
  value: visit.value,
  link: visit.link,
  social: visit.social,
}

/**
 * Marmalade: an old shop front, kept up with care. A deep painted fascia lined out in gilt carries the name of the shop in fine sign
 * lettering; under it the menu is lettered on a cream wall as a price list, and a second painted board closes the page with the
 * shop's hours and how to reach it. The owner's accent is the gilt. There is nothing here a good old sign would not have: no search, no cards.
 */
export function Template({ business, sections, groups, layout, tags, interactive, idOf, photoOf }: TemplateProps) {
  const ids = sections.map((_, index) => idOf(index))
  const active = useReadingBoard(ids, interactive)
  const reveal = useReveal(interactive)
  const links = sections.map(({ category }, index) => ({ key: category.id, id: idOf(index), name: category.name }))
  const visitId = idOf(sections.length)
  // The kit's section takes no ref, and a link has to land on the very element that waits, so its entrance is attached by id.
  useLayoutEffect(() => reveal(document.getElementById(visitId)), [reveal, visitId])

  return (
    <div className={styles.page} data-layout={layout} data-mode={business.theme.mode}>
      <Masthead business={business} as={tags.name} menuId={idOf(0)} visitId={hasVisit(business) ? visitId : null} interactive={interactive} />
      <div>
        <Tabs links={links} active={active} interactive={interactive} />
        <div className={styles.boards}>
          {sections.map((section, index) => (
            <Board key={section.category.id} section={section} id={idOf(index)} groups={groups} tags={tags} interactive={interactive} photoOf={photoOf} first={index === 0} reveal={reveal} />
          ))}
        </div>
      </div>
      <VisitSection business={business} interactive={interactive} id={visitId} headingTag={tags.category} classNames={VISIT_CLASSES} />
    </div>
  )
}
