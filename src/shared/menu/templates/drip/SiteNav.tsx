import { copy } from '@/config/copy'
import { motion, scrollPreviewTo, scrollToSection } from '../kit'
import styles from './SiteNav.module.css'

const text = copy.menu.view.template.siteNav

type Props = { menuId: string; visitId: string; interactive: boolean }

/** The two links of the site, in the band. In the Design preview they are the same words, with no link and no landmark. */
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
    <nav className={styles.nav} aria-label={text.label}>
      {places.map(({ key, id, name }) => (
        <a key={key} className={`${styles.link} ${motion.press}`} href={`#${id}`} onClick={(event) => scrollToSection(event, id)}>
          {name}
        </a>
      ))}
    </nav>
  )
}
