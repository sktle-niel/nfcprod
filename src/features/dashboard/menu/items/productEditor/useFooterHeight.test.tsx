import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openEditor } from './testHost'
import { SHEET_FOOTER_HEIGHT, useFooterHeight } from './useFooterHeight'

function Sheet() {
  const footer = useRef<HTMLDivElement>(null)
  useFooterHeight(footer)
  return (
    <dialog open>
      <div ref={footer} />
    </dialog>
  )
}

const heightOf = (value: number) => vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(value)

afterEach(() => vi.restoreAllMocks())

describe('useFooterHeight', () => {
  it('puts the height of the footer on the dialog around it, and follows a resize', () => {
    const height = heightOf(87.2)
    const { container } = render(<Sheet />)
    const sheet = container.querySelector('dialog') as HTMLDialogElement
    expect(sheet.style.getPropertyValue(SHEET_FOOTER_HEIGHT)).toBe('88px')

    height.mockReturnValue(120)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(sheet.style.getPropertyValue(SHEET_FOOTER_HEIGHT)).toBe('120px')
  })

  it('takes the height off the dialog when the footer goes', () => {
    heightOf(88)
    const { container, unmount } = render(<Sheet />)
    const sheet = container.querySelector('dialog') as HTMLDialogElement
    unmount()
    expect(sheet.style.getPropertyValue(SHEET_FOOTER_HEIGHT)).toBe('')
  })

  it('does nothing outside a dialog', () => {
    heightOf(88)
    function Loose() {
      const footer = useRef<HTMLDivElement>(null)
      useFooterHeight(footer)
      return <div ref={footer} />
    }
    expect(() => render(<Loose />)).not.toThrow()
  })
})

describe('the product editor', () => {
  it('tells its sheet how tall the sticky footer is, so a focused field is not left under it', async () => {
    heightOf(91)
    const { dialog } = await openEditor()
    expect(dialog.style.getPropertyValue(SHEET_FOOTER_HEIGHT)).toBe('91px')
  })
})
