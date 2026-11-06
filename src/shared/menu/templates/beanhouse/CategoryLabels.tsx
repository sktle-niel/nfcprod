import { useEffect, useRef } from 'react'
import { copy } from '@/config/copy'
import { centerItem, motion, scrollPreviewTo, scrollToSection } from '../kit'
import styles from './CategoryLabels.module.css'

type Link = { key: string; id: string; name: string }
type Props = { links: Link[]; /** The category being read. */ active: number; interactive: boolean }

/**
 * The categories, printed on a strip of the bag that stays at the top of the screen. A short rule marks the one being read.
 * On the page they are links; in the Design preview they are plain text that still scrolls the preview.
 */
export function CategoryLabels({ links, active, interactive }: Props) {
  const row = useRef<HTMLUListElement>(null)
  const shown = useRef(active)
  // As the page is read, the category being read slides into the middle of the strip (the strip, never the page).
  useEffect(() => {
    if (!interactive || shown.current === active) return
    shown.current = active
    centerItem(row.current, active)
  }, [active, interactive])

  const list = (
    <ul ref={row} className={styles.list}>
      {links.map(({ key, id, name }, index) => {
        const selected = index === active ? '' : undefined
        return (
          <li key={key}>
            {interactive ? (
              <a className={`${styles.link} ${motion.press}`} href={`#${id}`} data-selected={selected} aria-current={selected === undefined ? undefined : 'true'} onClick={(event) => scrollToSection(event, id)}>
                <span className={styles.label}>{name}</span>
              </a>
            ) : (
              // Not a link and no tab stop (the preview's rule), but a tap still goes to the category, as it will on the phone.
              <span className={styles.link} data-selected={selected} onClick={() => scrollPreviewTo(id)}>
                <span className={styles.label}>{name}</span>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
  // Without links there is nothing to navigate: a navigation landmark with plain text in it would only clutter the page.
  return interactive ? (
    <nav className={`${styles.strip} ${motion.opening} ${motion.afterTwo}`} aria-label={copy.menu.view.categoriesLabel}>
      {list}
    </nav>
  ) : (
    <div className={styles.strip}>{list}</div>
  )
}
