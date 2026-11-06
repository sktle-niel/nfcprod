import { copy } from '@/config/copy'
import { motion, scrollPreviewTo, scrollToSection } from '../kit'
import { Lozenge } from './Ornament'
import styles from './RunningHead.module.css'

const text = copy.menu.view.template.siteNav

/**
 * The running head of the card: the two places of the page, set small on the center line above the name. It goes only where there
 * is a Visit section to go to. In the Design preview the words are plain text that still scroll the frame, as they will on the phone.
 */
export function RunningHead({ menuId, visitId, interactive }: { menuId: string; visitId: string; interactive: boolean }) {
  const places = [
    { id: menuId, name: text.menu },
    { id: visitId, name: text.visit },
  ]
  const links = (
    <ul className={styles.list}>
      {places.map(({ id, name }, index) => (
        <li key={id} className={styles.place}>
          {index > 0 && <Lozenge />}
          {interactive ? (
            <a className={`${styles.link} ${motion.press}`} href={`#${id}`} onClick={(event) => scrollToSection(event, id)}>
              {name}
            </a>
          ) : (
            <span className={styles.link} onClick={() => scrollPreviewTo(id)}>
              {name}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
  return interactive ? (
    <nav className={`${styles.head} ${motion.opening}`} aria-label={text.label}>
      {links}
    </nav>
  ) : (
    <div className={styles.head}>{links}</div>
  )
}
