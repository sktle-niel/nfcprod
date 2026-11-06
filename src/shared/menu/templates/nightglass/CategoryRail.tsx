import { useEffect, useRef } from 'react'
import { copy } from '@/config/copy'
import { centerItem } from '../kit'
import { PlaceLink } from './PlaceLink'
import { useRailMark } from './useRailMark'
import styles from './CategoryRail.module.css'

type Link = { key: string; id: string; name: string }
type Props = { links: Link[]; /** The category being read. */ active: number; interactive: boolean }

/**
 * The category names along the top of the board, in its lettering, with one brass line under the one being read. They stay on screen
 * while the menu is read. On the page they are links; in the Design preview they are text that still scrolls the preview.
 */
export function CategoryRail({ links, active, interactive }: Props) {
  const row = useRef<HTMLUListElement>(null)
  const mark = useRef<HTMLLIElement>(null)
  const shown = useRef(active)
  useRailMark(row, mark, active, interactive)
  // As the page is read, the category being read slides into the middle of the rail (the rail, never the page).
  useEffect(() => {
    if (!interactive || shown.current === active) return
    shown.current = active
    centerItem(row.current, active)
  }, [active, interactive])

  const list = (
    <ul ref={row} className={styles.list}>
      {links.map(({ key, id, name }, index) => (
        <li key={key}>
          <PlaceLink id={id} className={styles.link} interactive={interactive} selected={index === active}>
            {name}
          </PlaceLink>
        </li>
      ))}
      {/* Last, so a link's place in the row stays its index. It is drawn in the row so that it scrolls with the names. */}
      <li ref={mark} className={styles.mark} aria-hidden="true" />
    </ul>
  )
  // Without links there is nothing to navigate: a navigation landmark with plain text in it would only clutter the page.
  return interactive ? (
    <nav className={styles.rail} aria-label={copy.menu.view.categoriesLabel}>
      {list}
    </nav>
  ) : (
    <div className={styles.rail}>{list}</div>
  )
}
