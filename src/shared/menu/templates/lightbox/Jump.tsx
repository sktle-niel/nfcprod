import type { ReactNode } from 'react'
import { motion, scrollPreviewTo, scrollToSection } from '../kit'

type Props = {
  /** The id of the place on the page. */
  to: string
  interactive: boolean
  className: string | undefined
  /** Marks the place being read, for the category strip. */
  selected?: boolean
  children: ReactNode
}

/**
 * A way to a place on the page. A real link on the public page; in the Design preview plain text with no tab stop, which a tap still
 * takes to the place, as it will on the phone.
 */
export function Jump({ to, interactive, className, selected = false, children }: Props) {
  const mark = selected ? '' : undefined
  if (!interactive) {
    return (
      <span className={className} data-selected={mark} onClick={() => scrollPreviewTo(to)}>
        {children}
      </span>
    )
  }
  return (
    <a className={[className, motion.press].join(' ')} href={`#${to}`} data-selected={mark} aria-current={selected ? 'true' : undefined} onClick={(event) => scrollToSection(event, to)}>
      {children}
    </a>
  )
}
