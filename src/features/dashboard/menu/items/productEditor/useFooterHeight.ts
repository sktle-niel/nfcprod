import { useEffect, type RefObject } from 'react'

/** The custom property the sheet's scroll padding reads (Modal.module.css), so a focused field is not left under the footer. */
export const SHEET_FOOTER_HEIGHT = '--sheet-footer-h'

/**
 * The sticky footer of the editor covers the bottom of the sheet. Its height goes on the dialog around it while it is on
 * the page, and follows it when the footer grows (a line of words appears above the buttons) or the window changes size.
 */
export function useFooterHeight(footer: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = footer.current
    const sheet = element?.closest('dialog')
    if (!element || !sheet) return

    const measure = () => sheet.style.setProperty(SHEET_FOOTER_HEIGHT, `${Math.ceil(element.offsetHeight)}px`)
    measure()

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      sheet.style.removeProperty(SHEET_FOOTER_HEIGHT)
    }
  }, [footer])
}
