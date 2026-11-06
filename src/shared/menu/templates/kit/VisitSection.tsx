import type { ReactNode } from 'react'
import { copy } from '@/config/copy'
import type { Business } from '@/entities/business/business'
import { dialHref, directionsHref, hasVisit, socialLinks } from '../../contact'
import motion from './motion.module.css'
import styles from './VisitSection.module.css'

const text = copy.menu.view

/** The parts a template can restyle. Each class is added to the kit's own, and always wins: the kit's rules weigh nothing (`:where`). */
export type VisitClassNames = Partial<Record<'root' | 'heading' | 'facts' | 'fact' | 'label' | 'value' | 'link' | 'social', string | undefined>>

type Props = {
  business: Pick<Business, 'phone' | 'address' | 'hours' | 'social'>
  /** False in the Design preview: no links, no landmark, no tab stops. */
  interactive: boolean
  /** The id of the section, the target of the template's Visit link. Kept in the preview too, where the frame scrolls to it. */
  id: string
  /** One level below the heading before it: usually `tags.category`. */
  headingTag: 'h2' | 'h3'
  classNames?: VisitClassNames | undefined
}

const joined = (...names: (string | undefined)[]) => names.filter(Boolean).join(' ')

/**
 * The Visit section of a template: the hours as the owner wrote them, the address with a Directions link, the phone with a tap to
 * call, and the social links. Each block appears only with data behind it, and the whole section draws nothing with none: ask
 * `hasVisit(business)` before drawing a link to it. Text takes the color of what holds it; the labels use --menu-muted, so a
 * template that puts this on a card gives `label` the --menu-card-muted color. Each fact carries `data-fact` (hours, address,
 * phone, social) for a template that lays them out one by one.
 */
export function VisitSection({ business, interactive, id, headingTag: Heading, classNames = {} }: Props) {
  if (!hasVisit(business)) return null
  const Root = interactive ? 'section' : 'div'
  const titleId = `${id}-title`
  const link = joined(styles.link, motion.press, classNames.link)
  const hours = business.hours.trim()
  const address = business.address.trim()
  const phone = business.phone.trim()
  const dial = dialHref(phone)
  const directions = directionsHref(address)
  const links = socialLinks(business.social)

  const fact = (name: string, label: string, children: ReactNode) => (
    <div className={joined(styles.fact, classNames.fact)} data-fact={name}>
      <p className={joined(styles.label, classNames.label)}>{label}</p>
      {children}
    </div>
  )

  return (
    <Root id={id} className={joined(styles.root, classNames.root)} aria-labelledby={interactive ? titleId : undefined}>
      <Heading id={titleId} className={joined(styles.heading, classNames.heading)}>
        {text.template.visit.heading}
      </Heading>
      <div className={joined(styles.facts, classNames.facts)}>
        {hours !== '' && fact('hours', text.footer.hours, <p className={joined(styles.value, styles.hours, classNames.value)}>{hours}</p>)}
        {address !== '' &&
          fact(
            'address',
            text.footer.address,
            <>
              <p className={joined(styles.value, classNames.value)}>{address}</p>
              {interactive && directions !== null && (
                <a className={link} href={directions} target="_blank" rel="noopener noreferrer" aria-label={text.template.visit.directionsLabel}>
                  {text.template.visit.directions}
                </a>
              )}
            </>,
          )}
        {phone !== '' &&
          fact(
            'phone',
            text.footer.phone,
            interactive && dial !== null ? (
              <a className={link} href={dial}>
                {phone}
              </a>
            ) : (
              <p className={joined(styles.value, classNames.value)}>{phone}</p>
            ),
          )}
        {links.length > 0 &&
          fact(
            'social',
            text.footer.social,
            <ul className={joined(styles.social, classNames.social)}>
              {links.map(({ network, href }) => (
                <li key={network}>
                  {interactive ? (
                    <a className={link} href={href} target="_blank" rel="noopener noreferrer">
                      {text.social[network]}
                    </a>
                  ) : (
                    <span className={joined(styles.value, classNames.value)}>{text.social[network]}</span>
                  )}
                </li>
              ))}
            </ul>,
          )}
      </div>
    </Root>
  )
}
