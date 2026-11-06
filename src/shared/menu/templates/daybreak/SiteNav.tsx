import { copy } from '@/config/copy'
import { motion, scrollPreviewTo, scrollToSection } from '../kit'
import { joined } from './classes'
import styles from './SiteNav.module.css'

const text = copy.menu.view.template.siteNav

type Props = { menuId: string; visitId: string; interactive: boolean }

/**
 * Two words in the top corners of the sheet, as a printed page carries its running heads: Menu on the left, Visit on the right. On
 * the page they are links; in the Design preview they are plain text that still scrolls the preview, with no landmark.
 */
export function SiteNav({ menuId, visitId, interactive }: Props) {
  const places = [
    { key: 'menu', id: menuId, name: text.menu },
    { key: 'visit', id: visitId, name: text.visit },
  ]
  if (!interactive) {
    return (
      <div className={styles.nav}>
        {places.map(({ key, id, name }) => (
          <span key={key} className={styles.link} onClick={() => scrollPreviewTo(id)}>
            {name}
          </span>
        ))}
      </div>
    )
  }
  return (
    <nav className={joined(styles.nav, motion.opening)} aria-label={text.label}>
      {places.map(({ key, id, name }) => (
        <a key={key} className={joined(styles.link, motion.press)} href={`#${id}`} onClick={(event) => scrollToSection(event, id)}>
          {name}
        </a>
      ))}
    </nav>
  )
}
