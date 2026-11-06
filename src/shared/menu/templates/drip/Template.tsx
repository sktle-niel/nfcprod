import type { BusinessType } from '@/entities/business/business'
import { hasVisit, useReveal, VisitSection } from '../kit'
import type { TemplateProps } from '../types'
import { Band } from './Band'
import { CategoryLine } from './CategoryLine'
import { Section } from './Section'
import { SiteNav } from './SiteNav'
import { useReadingSection } from './useReadingSection'
import styles from './Template.module.css'
import visit from './Visit.module.css'

/** The shops the chocolate belongs to. Any other shop keeps the list and gets a straight band. */
const DRIP_SHOPS: readonly BusinessType[] = ['coffee', 'milkTea', 'bakery']

const VISIT_CLASSES = { root: visit.root, heading: visit.heading, facts: visit.facts, fact: visit.fact, label: visit.label, value: visit.value, link: visit.link, social: visit.social }

/**
 * Drip: a coffeehouse price list, the densest page of the seven and the one for a shop with no pictures. The page opens on one
 * chocolate band with the name, the two links of the site and a poured edge, and closes on the same chocolate with the Visit section.
 * Between them there is only warm paper and one ink: a script title on a fine rule for each category, then name, leader and price,
 * line after line, with sizes in columns as a printed list has them. Product pictures are never drawn. List is one column. Grid is
 * two columns of the list on a wide screen, and a tighter list on a phone.
 */
export function Template({ business, sections, groups, layout, tags, interactive, idOf }: TemplateProps) {
  const links = sections.map(({ category }, index) => ({ key: category.id, id: idOf(index), name: category.name }))
  const active = useReadingSection(
    links.map(({ id }) => id),
    interactive,
  )
  const reveal = useReveal(interactive)
  const drips = business.types?.some((type) => DRIP_SHOPS.includes(type)) ?? false
  const visitId = `${idOf(0)}-visit`
  const visits = hasVisit(business)
  return (
    <div className={styles.sheet} data-layout={layout} data-edge={drips ? 'drip' : 'straight'}>
      <Band business={business} as={tags.name} drips={drips} interactive={interactive}>
        {/* With nowhere else to go, one link to the list right under it would be a control with nothing behind it. */}
        {visits && <SiteNav menuId={idOf(0)} visitId={visitId} interactive={interactive} />}
      </Band>
      {/* The category line lives in here, so it stays with the list and lets go at the end of it. */}
      <div className={styles.menu}>
        <CategoryLine links={links} active={active} interactive={interactive} />
        <div className={styles.sections}>
          {sections.map((section, index) => (
            <Section key={section.category.id} section={section} index={index} groups={groups} tags={tags} interactive={interactive} idOf={idOf} reveal={reveal} />
          ))}
        </div>
      </div>
      {visits && (
        <div ref={reveal} className={visit.close}>
          <VisitSection business={business} interactive={interactive} id={visitId} headingTag={tags.category} classNames={VISIT_CLASSES} />
        </div>
      )}
    </div>
  )
}
