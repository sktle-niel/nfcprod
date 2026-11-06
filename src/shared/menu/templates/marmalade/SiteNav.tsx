import { copy } from '@/config/copy'
import { motion, scrollPreviewTo, scrollToSection } from '../kit'
import styles from './SiteNav.module.css'

const text = copy.menu.view.template.siteNav

type Props = { menuId: string; visitId: string; interactive: boolean }

/** The two places of the page, on the top rail of the sign. In the Design preview they are plain text that still scrolls the frame. */
export function SiteNav({ menuId, visitId, interactive }: Props) {
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
  // Without links there is nothing to navigate: no landmark in the preview.
  return interactive ? <nav aria-label={text.label}>{list}</nav> : list
}
