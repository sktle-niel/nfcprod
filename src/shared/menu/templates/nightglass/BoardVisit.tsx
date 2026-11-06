import { useCallback, type ComponentProps } from 'react'
import { hasVisit, useReveal, VisitSection } from '../kit'
import styles from './BoardVisit.module.css'

type Props = Pick<ComponentProps<typeof VisitSection>, 'business' | 'id' | 'headingTag' | 'interactive'>

const classNames = {
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
 * The last panel of the board: where the shop is, set like one more category, what it is on the left and the answer in the price column.
 * The entrance is held on the section itself, not on this holder, so that a link to the section finds it and settles it first.
 */
export function BoardVisit({ business, id, headingTag, interactive }: Props) {
  const reveal = useReveal(interactive)
  const holder = useCallback((element: HTMLDivElement | null) => reveal(element?.firstElementChild instanceof HTMLElement ? element.firstElementChild : null), [reveal])
  if (!hasVisit(business)) return null
  return (
    <div ref={holder}>
      <VisitSection business={business} id={id} headingTag={headingTag} interactive={interactive} classNames={classNames} />
    </div>
  )
}
