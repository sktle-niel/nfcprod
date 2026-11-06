import { useEffect, useRef } from 'react'
import { copy } from '@/config/copy'
import { centerItem, motion, scrollPreviewTo, scrollToSection } from '../kit'
import { useTabMark } from './useTabMark'
import styles from './Tabs.module.css'

type Link = { key: string; id: string; name: string }
type Props = { links: Link[]; /** The category being read. */ active: number; interactive: boolean }

/** The categories, on a rail that stays at the top of the screen while the menu is read, with a gilt mark under the current one. In the Design preview they are plain text that still scrolls it. */
export function Tabs({ links, active, interactive }: Props) {
  const row = useRef<HTMLUListElement>(null)
  const centered = useRef(active)
  useTabMark(row, active, interactive)
  useEffect(() => {
    if (!interactive || centered.current === active) return
    centered.current = active
    centerItem(row.current, active)
  }, [active, interactive])

  const list = (
    <ul ref={row} className={styles.list}>
      {links.map(({ key, id, name }, index) => {
        const selected = index === active ? '' : undefined
        return (
          <li key={key}>
            {interactive ? (
              <a className={`${styles.tab} ${motion.press}`} href={`#${id}`} data-selected={selected} aria-current={selected === undefined ? undefined : 'true'} onClick={(event) => scrollToSection(event, id)}>
                {name}
              </a>
            ) : (
              <span className={styles.tab} data-selected={selected} onClick={() => scrollPreviewTo(id)}>
                {name}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
  // Without links there is nothing to navigate: no landmark in the preview.
  return interactive ? (
    <nav className={styles.rail} aria-label={copy.menu.view.categoriesLabel}>
      {list}
    </nav>
  ) : (
    <div className={styles.rail}>{list}</div>
  )
}
