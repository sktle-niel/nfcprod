import { useCallback } from 'react'
import { VisitSection, type useReveal } from '../kit'
import type { TemplateProps } from '../types'
import styles from './Visit.module.css'

type Props = {
  business: TemplateProps['business']
  id: string
  as: 'h2' | 'h3'
  interactive: boolean
  reveal: ReturnType<typeof useReveal>
}

const parts = {
  root: styles.root,
  heading: styles.heading,
  facts: styles.facts,
  fact: styles.fact,
  label: styles.label,
  value: styles.value,
  link: styles.link,
  social: styles.social,
}

/**
 * The last leaf of the card: where the shop is, when it is open and how to reach it, on the center line like everything before it.
 * The entrance goes on the section itself, not on this box: the Visit link scrolls to the section, and must find it settled.
 */
export function Visit({ business, id, as, interactive, reveal }: Props) {
  const hold = useCallback((box: HTMLDivElement | null) => reveal(box?.firstElementChild instanceof HTMLElement ? box.firstElementChild : null), [reveal])
  return (
    <div ref={hold}>
      <VisitSection business={business} interactive={interactive} id={id} headingTag={as} classNames={parts} />
    </div>
  )
}
