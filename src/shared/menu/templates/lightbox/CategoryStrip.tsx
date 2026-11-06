import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { copy } from '@/config/copy'
import { centerItem } from '../kit'
import { Jump } from './Jump'
import styles from './CategoryStrip.module.css'

type Link = { key: string; id: string; name: string }
type Props = {
  links: Link[]
  /** The category being read. */
  active: number
  interactive: boolean
  /** The opening step of the strip, on the public page. */
  className: string
}

/**
 * Lays the brass mark under the link at `active`, by telling the row where that link is. Measured again when a link changes size (a
 * font arriving, a wider screen). It glides only once it stands somewhere, so it does not slide in from the edge as the page opens,
 * and only on the public page.
 */
function useCategoryMark(row: RefObject<HTMLElement | null>, active: number, interactive: boolean) {
  useLayoutEffect(() => {
    const list = row.current
    if (list === null) return undefined
    const place = () => {
      const item = list.children[active]
      if (!(item instanceof HTMLElement)) return
      list.style.setProperty('--tpl-mark-x', `${item.offsetLeft}px`)
      list.style.setProperty('--tpl-mark-width', String(item.offsetWidth))
    }
    place()
    const watcher = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null
    for (const item of list.children) watcher?.observe(item)
    const frame = interactive ? requestAnimationFrame(() => list.setAttribute('data-glide', '')) : 0
    return () => {
      watcher?.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [row, active, interactive])
}

/**
 * The categories, which stay at the top of the screen while the menu is read. A brass mark stands under the one being read and moves
 * to the next as the page goes by. On the page they are links; in the Design preview they are plain text that still scrolls it.
 */
export function CategoryStrip({ links, active, interactive, className }: Props) {
  const row = useRef<HTMLUListElement>(null)
  const shown = useRef(active)
  useCategoryMark(row, active, interactive)
  // As the page is read, the category being read slides into the middle of the strip (the strip, never the page).
  useEffect(() => {
    if (!interactive || shown.current === active) return
    shown.current = active
    centerItem(row.current, active)
  }, [active, interactive])

  const list = (
    <ul ref={row} className={styles.list}>
      {links.map(({ key, id, name }, index) => (
        <li key={key}>
          <Jump to={id} interactive={interactive} className={styles.link} selected={index === active}>
            {name}
          </Jump>
        </li>
      ))}
    </ul>
  )
  // Without links there is nothing to navigate: a navigation landmark with plain text in it would only clutter the page.
  return interactive ? (
    <nav className={`${styles.strip} ${className}`} aria-label={copy.menu.view.categoriesLabel}>
      {list}
    </nav>
  ) : (
    <div className={styles.strip}>{list}</div>
  )
}
