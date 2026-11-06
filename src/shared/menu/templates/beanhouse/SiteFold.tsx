import { copy } from '@/config/copy'
import { motion, scrollPreviewTo, scrollToSection } from '../kit'
import styles from './SiteFold.module.css'

const text = copy.menu.view.template.siteNav

type Props = {
  menuId: string
  /** The id of the Visit section, or null for a shop with nothing to visit by. */
  visitId: string | null
  interactive: boolean
}

/**
 * The top of the bag, folded over and stitched shut, carrying the two links of the site. With nothing to visit by, one link to a menu
 * that starts right below would do nothing, so the fold stays bare. In the Design preview the words are plain text that still scroll
 * the preview, as the labels below do, and there is no landmark: it would only clutter the owner's page.
 */
export function SiteFold({ menuId, visitId, interactive }: Props) {
  if (visitId === null) return <div className={styles.fold} />
  const places = [
    { id: menuId, name: text.menu },
    { id: visitId, name: text.visit },
  ]
  const list = (
    <ul className={styles.list}>
      {places.map(({ id, name }) => (
        <li key={id}>
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
    <nav className={styles.fold} aria-label={text.label}>
      {list}
    </nav>
  ) : (
    <div className={styles.fold}>{list}</div>
  )
}
