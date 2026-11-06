import { afterEach, describe, expect, it, vi } from 'vitest'
import { centerItem, scrollPreviewTo, scrollToSection } from './anchorScroll'

const motionAllowed = (allowed: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: allowed ? false : query.includes('reduce') }))

function section(id: string) {
  const element = document.createElement('section')
  element.id = id
  element.scrollIntoView = vi.fn()
  document.body.append(element)
  return element
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('scrollToSection', () => {
  const tap = () => ({ preventDefault: vi.fn() })

  it('glides to the section, keeps the address, and hands focus over', () => {
    motionAllowed(true)
    const target = section('visit')
    const event = tap()
    scrollToSection(event as never, 'visit')
    expect(event.preventDefault).toHaveBeenCalled()
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(document.activeElement).toBe(target)
  })

  it('jumps for a person who asked for calm motion', () => {
    motionAllowed(false)
    const target = section('visit')
    scrollToSection(tap() as never, 'visit')
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('leaves the link alone when the section is not there', () => {
    const event = tap()
    scrollToSection(event as never, 'gone')
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})

describe('scrollPreviewTo', () => {
  it('scrolls the frame alone, jumping under calm motion', () => {
    motionAllowed(false)
    const frame = document.createElement('div')
    frame.style.overflowY = 'auto'
    frame.scrollTo = vi.fn() as never
    const target = section('visit')
    frame.append(target)
    document.body.append(frame)
    scrollPreviewTo('visit')
    expect(frame.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    expect(target.scrollIntoView).not.toHaveBeenCalled()
  })
})

describe('centerItem', () => {
  it('slides the row, never past its start, and survives a missing row or item', () => {
    motionAllowed(true)
    const row = document.createElement('ul')
    row.scrollTo = vi.fn() as never
    row.append(document.createElement('li'))
    centerItem(row, 0)
    expect(row.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
    expect(() => centerItem(null, 0)).not.toThrow()
    expect(() => centerItem(row, 5)).not.toThrow()
  })
})
