import type { ReactNode } from 'react'
import { motion, scrollPreviewTo, scrollToSection } from '../kit'

type Props = { id: string; className: string | undefined; interactive: boolean; selected?: boolean; children: ReactNode }

/**
 * A word on the board that leads to a place on the page. On the page it is a link. In the Design preview it is text with no tab stop
 * (the preview's rule), though a tap still goes there, as it will on the phone.
 */
export function PlaceLink({ id, className, interactive, selected = false, children }: Props) {
  const mark = selected ? '' : undefined
  return interactive ? (
    <a className={[className, motion.press].join(' ')} href={`#${id}`} data-selected={mark} aria-current={selected ? 'true' : undefined} onClick={(event) => scrollToSection(event, id)}>
      {children}
    </a>
  ) : (
    <span className={className} data-selected={mark} onClick={() => scrollPreviewTo(id)}>
      {children}
    </span>
  )
}
