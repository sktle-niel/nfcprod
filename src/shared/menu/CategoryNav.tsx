import type { MouseEvent } from 'react'
import { copy } from '@/config/copy'
import type { Section } from './sections'
import styles from './MenuView.module.css'

type Props = { sections: Section[]; idOf: (index: number) => string; interactive?: boolean }

const calmMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Scrolls inside the page or the preview frame without touching the address (a hash would confuse the router). */
function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id)
  if (!target || typeof target.scrollIntoView !== 'function') return
  event.preventDefault()
  target.scrollIntoView({ behavior: calmMotion() ? 'auto' : 'smooth', block: 'start' })
  // The hash jump this replaces would also have moved the reading position: hand focus over, or a keyboard or screen reader stays in the nav.
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

/** The nearest box around `element` that scrolls (the preview frame), or null on a page that scrolls as a whole. */
function scrollBoxOf(element: Element): HTMLElement | null {
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return null
}

/**
 * A tap in the Design preview: scrolls the frame alone to the section, as the phone will, and leaves the page around the
 * frame where it is (scrollIntoView would move that too). The title keeps its distance from the sticky row (scroll-margin-top).
 */
function scrollPreviewTo(id: string) {
  const target = document.getElementById(id)
  const box = target === null ? null : scrollBoxOf(target)
  if (target === null || box === null) return
  const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  const top = box.scrollTop + target.getBoundingClientRect().top - box.getBoundingClientRect().top - margin
  if (typeof box.scrollTo === 'function') box.scrollTo({ top, behavior: calmMotion() ? 'auto' : 'smooth' })
  else box.scrollTop = top
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
            // Not a link and no tab stop (the preview's rule), but a tap still goes to the category, as it will on the phone.
            <span className={`${styles.navLink} ${styles.navTap}`} onClick={() => scrollPreviewTo(idOf(index))}>
              {category.name}
            </span>
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
