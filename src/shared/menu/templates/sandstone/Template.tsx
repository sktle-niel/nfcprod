import { hasVisit, useReveal } from '../kit'
import type { TemplateProps } from '../types'
import { CategorySection } from './CategorySection'
import { Contents } from './Contents'
import { Masthead } from './Masthead'
import { Ornament } from './Ornament'
import { RunningHead } from './RunningHead'
import { Visit } from './Visit'
import styles from './Template.module.css'

/**
 * Sandstone: a printed carte, the one card a good restaurant hands you. Sand paper, one deep warm ink, a serif voice throughout. The
 * name of the shop stands over a swelled rule; the courses follow on the center line, each under its title in spaced capitals, and
 * the items are type, with a single plate to a course, in its true color, like a plate in a fine book. It is read, so a contents
 * line stays at the top while the menu lasts, and the last leaf says where the shop is. The page settles once as it opens.
 */
export function Template({ business, sections, groups, layout, tags, interactive, idOf, photoOf }: TemplateProps) {
  const reveal = useReveal(interactive)
  const menuId = `${idOf(0)}-menu`
  const visitId = `${idOf(0)}-visit`
  return (
    <div className={styles.page} data-layout={layout}>
      {hasVisit(business) && <RunningHead menuId={menuId} visitId={visitId} interactive={interactive} />}
      <Masthead business={business} as={tags.name} interactive={interactive} />
      {/* The box ends the sticky contents line with the menu: the Visit leaf is not a course. */}
      <div id={menuId} className={styles.menu}>
        {sections.length > 1 && <Contents entries={sections.map(({ category }, index) => ({ key: category.id, id: idOf(index), name: category.name }))} interactive={interactive} />}
        {sections.map((section, index) => (
          <CategorySection key={section.category.id} section={section} id={idOf(index)} layout={layout} tags={tags} groups={groups} interactive={interactive} photoOf={photoOf} first={index === 0} reveal={reveal} />
        ))}
      </div>
      <div className={styles.close}>
        <Ornament />
      </div>
      <Visit business={business} id={visitId} as={tags.category} interactive={interactive} reveal={reveal} />
    </div>
  )
}
