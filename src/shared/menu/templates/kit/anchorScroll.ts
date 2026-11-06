import type { MouseEvent } from 'react'
import { calmMotion } from './calmMotion'
import { settleReveal } from './useReveal'

/**
 * A tap on a link to a place on this page. Scrolls there inside the page without touching the address (a hash would confuse the
 * router), gliding or jumping as the person prefers, then hands focus over so a keyboard or a screen reader follows. A section still
 * waiting for its `useReveal` entrance settles first: it sits a little low until then, and the scroll would land that much off.
 */
export function scrollToSection(event: MouseEvent<HTMLElement>, id: string): void {
  const target = document.getElementById(id)
  if (!target || typeof target.scrollIntoView !== 'function') return
  event.preventDefault()
  settleReveal(target)
  target.scrollIntoView({ behavior: calmMotion() ? 'auto' : 'smooth', block: 'start' })
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
 * A tap in the Design preview, where nothing is a link: scrolls the frame alone to the place, as the phone will, and leaves the page
 * around the frame where it is (`scrollIntoView` would move that too). The place keeps its distance from the top (scroll-margin-top).
 */
export function scrollPreviewTo(id: string): void {
  const target = document.getElementById(id)
  const box = target === null ? null : scrollBoxOf(target)
  if (target === null || box === null) return
  const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  const top = box.scrollTop + target.getBoundingClientRect().top - box.getBoundingClientRect().top - margin
  if (typeof box.scrollTo === 'function') box.scrollTo({ top, behavior: calmMotion() ? 'auto' : 'smooth' })
  else box.scrollTop = top
}

/** Slides a row sideways (never the page) so its child at `index` sits in the middle: the category being read stays in view. */
export function centerItem(row: HTMLElement | null, index: number): void {
  const item = row?.children[index]
  if (!row || !(item instanceof HTMLElement) || typeof row.scrollTo !== 'function') return
  const left = item.offsetLeft - (row.clientWidth - item.offsetWidth) / 2
  row.scrollTo({ left: Math.max(0, left), behavior: calmMotion() ? 'auto' : 'smooth' })
}
