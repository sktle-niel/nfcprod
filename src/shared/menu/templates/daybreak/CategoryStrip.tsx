import { useEffect, useRef } from 'react'
import { copy } from '@/config/copy'
import { centerItem, motion, scrollPreviewTo, scrollToSection } from '../kit'
import { joined } from './classes'
import styles from './CategoryStrip.module.css'

type Link = { key: string; id: string; name: string }
type Props = {
  links: Link[]
  /** The category being read. */
  active: number
  interactive: boolean
  /** For the opening of the page. */
  className?: string | undefined
}

/**
 * The categories, as a band of solid ink across the sheet that stays at the top of the screen while the menu is read. On the page
 * they are links; in the Design preview they are plain text that still scrolls the preview.
 */
export function CategoryStrip({ links, active, interactive, className }: Props) {
  const row = useRef<HTMLUListElement>(null)
  const shown = useRef(active)
  // As the page is read, the category being read slides into the middle of the band (the band, never the page).
  useEffect(() => {
    if (!interactive || shown.current === active) return
    shown.current = active
    centerItem(row.current, active)
  }, [active, interactive])
  if (links.length === 0) return null

  const list = (
    <ul ref={row} className={styles.list}>
      {links.map(({ key, id, name }, index) => {
        const selected = index === active ? '' : undefined
        return (
          <li key={key}>
            {interactive ? (
              <a className={joined(styles.link, motion.press)} href={`#${id}`} data-selected={selected} aria-current={selected === undefined ? undefined : 'true'} onClick={(event) => scrollToSection(event, id)}>
                {name}
              </a>
            ) : (
              // Not a link and no tab stop (the preview's rule), but a tap still goes to the category, as it will on the phone.
              <span className={styles.link} data-selected={selected} onClick={() => scrollPreviewTo(id)}>
                {name}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
  // Without links there is nothing to navigate: a navigation landmark with plain text in it would only clutter the page.
  return interactive ? (
    <nav className={joined(styles.strip, className)} aria-label={copy.menu.view.categoriesLabel}>
      {list}
    </nav>
  ) : (
    <div className={joined(styles.strip, className)}>{list}</div>
  )
}
