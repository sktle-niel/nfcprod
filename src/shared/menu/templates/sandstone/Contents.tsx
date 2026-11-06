import { useEffect, useRef, useState } from 'react'
import { copy } from '@/config/copy'
import { centerItem, motion, scrollPreviewTo, scrollToSection, useScrollSpy } from '../kit'
import styles from './Contents.module.css'

/** One category the line can go to: the id of its section on the page, and its name. */
export type ContentsEntry = { key: string; id: string; name: string }

/** A person's own scrolling ends a pick, so the line goes back to following what is being read. */
const OWN_INPUT = ['wheel', 'touchstart', 'keydown'] as const

/**
 * The contents of the card, one line of spaced capitals between two fine rules, which stays at the top of the screen while the
 * menu is read. A fine rule grows under the category being read as the last one's shrinks; a tap goes there and marks it at once,
 * even a short last one the page cannot scroll up to the reading line. In the Design preview the names are plain text that still
 * scrolls the preview.
 */
export function Contents({ entries, interactive }: { entries: ContentsEntry[]; interactive: boolean }) {
  const list = useRef<HTMLUListElement>(null)
  const spied = useScrollSpy(
    entries.map((entry) => entry.id),
    interactive,
  )
  const [picked, setPicked] = useState<number | null>(null)
  const active = Math.min(picked ?? spied, entries.length - 1)

  // The marked name stays in view: the row of names scrolls sideways to it, never the page.
  useEffect(() => {
    if (interactive) centerItem(list.current, active)
  }, [active, interactive])

  useEffect(() => {
    if (picked === null) return undefined
    const release = () => setPicked(null)
    for (const type of OWN_INPUT) window.addEventListener(type, release, { passive: true, once: true })
    return () => {
      for (const type of OWN_INPUT) window.removeEventListener(type, release)
    }
  }, [picked])

  const names = (
    <ul ref={list} className={styles.list}>
      {entries.map(({ key, id, name }, index) => {
        const current = index === active
        return (
          <li key={key}>
            {interactive ? (
              <a
                className={`${styles.link} ${motion.press}`}
                href={`#${id}`}
                data-current={current ? '' : undefined}
                aria-current={current ? 'true' : undefined}
                onClick={(event) => {
                  setPicked(index)
                  scrollToSection(event, id)
                }}
              >
                {name}
              </a>
            ) : (
              // Not a link and no tab stop (the preview's rule), but a tap still goes to the category, as it will on the phone.
              <span className={styles.link} data-current={current ? '' : undefined} onClick={() => scrollPreviewTo(id)}>
                {name}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
  return interactive ? (
    <nav className={`${styles.contents} ${motion.opening} ${motion.afterTwo}`} aria-label={copy.menu.view.categoriesLabel}>
      {names}
    </nav>
  ) : (
    <div className={styles.contents}>{names}</div>
  )
}
