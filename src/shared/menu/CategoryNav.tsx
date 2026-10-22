import type { MouseEvent } from 'react'
import { copy } from '@/config/copy'
import type { Section } from './sections'
import styles from './MenuView.module.css'

type Props = { sections: Section[]; idOf: (index: number) => string; interactive?: boolean }

/** Scrolls inside the page or the preview frame without touching the address (a hash would confuse the router). */
function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id)
  if (!target || typeof target.scrollIntoView !== 'function') return
  event.preventDefault()
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  // The hash jump this replaces would also have moved the reading position: hand focus over, or a keyboard or screen reader stays in the nav.
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

export function CategoryNav({ sections, idOf, interactive = true }: Props) {
  const list = (
    <ul className={styles.navList}>
      {sections.map(({ category }, index) => (
        <li key={category.id}>
          {interactive ? (
            <a className={styles.navLink} href={`#${idOf(index)}`} onClick={(event) => scrollToSection(event, idOf(index))}>
              {category.name}
            </a>
          ) : (
            <span className={styles.navLink}>{category.name}</span>
          )}
        </li>
      ))}
    </ul>
  )
  // Without links there is nothing to navigate: a navigation landmark with plain text in it would only clutter the page.
  return interactive ? (
    <nav className={styles.nav} aria-label={copy.menu.view.categoriesLabel}>
      {list}
    </nav>
  ) : (
    <div className={styles.nav}>{list}</div>
  )
}
