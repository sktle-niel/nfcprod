import { useEffect, useRef } from 'react'
import { copy } from '@/config/copy'
import { centerItem, motion, scrollPreviewTo, scrollToSection } from '../kit'
import styles from './CategoryLine.module.css'

type Link = { key: string; id: string; name: string }
type Props = { links: Link[]; /** The category being read. */ active: number; interactive: boolean }

/**
 * The categories on one line that stays at the top of the screen while the list is read. On the page they are links; in the Design
 * preview they are plain text that still scrolls the preview. The line slides by itself to keep the category being read in view.
 */
export function CategoryLine({ links, active, interactive }: Props) {
  const row = useRef<HTMLUListElement>(null)
  const shown = useRef(active)
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
                {name}
              </a>
            ) : (
              <span className={styles.link} data-selected={selected} onClick={() => scrollPreviewTo(id)}>
                {name}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
  // In the preview this is plain text: a navigation landmark would only clutter the owner's page.
  return interactive ? (
    <nav className={styles.line} aria-label={copy.menu.view.categoriesLabel}>
      {list}
    </nav>
  ) : (
    <div className={styles.line}>{list}</div>
  )
}
