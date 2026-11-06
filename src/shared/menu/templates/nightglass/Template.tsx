import { hasVisit, motion, useReveal } from '../kit'
import type { TemplateProps } from '../types'
import { BoardSection } from './BoardSection'
import { BoardVisit } from './BoardVisit'
import { CategoryRail } from './CategoryRail'
import { Masthead } from './Masthead'
import { pinnedPhotos } from './photos'
import { SiteNav } from './SiteNav'
import { useReadingSection } from './useReadingSection'
import styles from './Template.module.css'

/**
 * Night Glass: the lettered menu board on the back wall of a good, quiet room. The whole page is the board, in its thin wooden frame,
 * with one lamp above it that comes up as the page opens. The name of the shop is gilded across the top, each category is headed in the
 * same hand with its sizes over the price columns, at most one small print hangs at each, and the last panel of the board says how to
 * find the shop. By day it is the same board painted pale, with dark lettering.
 */
export function Template(props: TemplateProps) {
  const { business, sections, groups, layout, tags, interactive, idOf, photoOf } = props
  const active = useReadingSection(
    sections.map((_, index) => idOf(index)),
    interactive,
  )
  const reveal = useReveal(interactive)
  const pins = pinnedPhotos(sections, photoOf)
  const menuId = `${idOf(0)}-menu`
  const visitId = `${idOf(0)}-visit`

  return (
    <div className={styles.page} data-layout={layout} data-mode={business.theme.mode} data-live={interactive ? '' : undefined}>
      <div className={styles.board}>
        {hasVisit(business) && <SiteNav menuId={menuId} visitId={visitId} interactive={interactive} />}
        <Masthead business={business} as={tags.name} interactive={interactive} />
        {/* The rail stays inside this box, so it goes when the menu ends and the Visit panel has the screen to itself. */}
        <div id={menuId} className={interactive ? `${styles.menu} ${motion.opening} ${motion.afterTwo}` : styles.menu}>
          {sections.length > 1 && <CategoryRail links={sections.map(({ category }, index) => ({ key: category.id, id: idOf(index), name: category.name }))} active={active} interactive={interactive} />}
          <div className={styles.sections}>
            {sections.map((section, index) => (
              <BoardSection key={section.category.id} section={section} id={idOf(index)} pin={pins[index] ?? null} first={index === 0} groups={groups} tags={tags} interactive={interactive} reveal={reveal} />
            ))}
          </div>
        </div>
        <BoardVisit business={business} id={visitId} headingTag={tags.category} interactive={interactive} />
      </div>
    </div>
  )
}
