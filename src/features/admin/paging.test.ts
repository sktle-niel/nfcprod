import { describe, expect, it, vi } from 'vitest'
import { pageItems, paginate, showTop } from './paging'

const items = Array.from({ length: 25 }, (_, index) => index + 1)

describe('paginate', () => {
  it('cuts a page and says where it sits among all the rows', () => {
    expect(paginate(items, 1, 10)).toEqual({ rows: items.slice(0, 10), page: 1, pageCount: 3, from: 1, to: 10, total: 25 })
    expect(paginate(items, 3, 10)).toEqual({ rows: [21, 22, 23, 24, 25], page: 3, pageCount: 3, from: 21, to: 25, total: 25 })
  })

  it('brings a page that does not exist back into range', () => {
    expect(paginate(items, 9, 10).page).toBe(3)
    expect(paginate(items, 0, 10).page).toBe(1)
    expect(paginate(items, -4, 10).page).toBe(1)
  })

  it('fills the last page exactly when the rows divide evenly', () => {
    expect(paginate(items.slice(0, 20), 2, 10)).toMatchObject({ pageCount: 2, from: 11, to: 20 })
  })

  it('has one empty page for no rows', () => {
    expect(paginate([], 1, 10)).toEqual({ rows: [], page: 1, pageCount: 1, from: 0, to: 0, total: 0 })
  })
})

describe('pageItems', () => {
  it.each([
    [1, 1, [1]],
    [2, 5, [1, 2, 3, 4, 5]],
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
    [1, 20, [1, 2, 3, 4, 5, null, 20]],
    [4, 20, [1, 2, 3, 4, 5, null, 20]],
    [5, 20, [1, null, 4, 5, 6, null, 20]],
    [12, 20, [1, null, 11, 12, 13, null, 20]],
    [17, 20, [1, null, 16, 17, 18, 19, 20]],
    [20, 20, [1, null, 16, 17, 18, 19, 20]],
  ])('on page %d of %d shows %j', (page, count, expected) => {
    expect(pageItems(page, count)).toEqual(expected)
  })

  it('never shows more than seven slots, and always the current page', () => {
    for (let count = 1; count <= 40; count += 1) {
      for (let page = 1; page <= count; page += 1) {
        const slots = pageItems(page, count)
        expect(slots.length).toBeLessThanOrEqual(7)
        expect(slots).toContain(page)
        expect(slots).toContain(1)
        expect(slots).toContain(count)
      }
    }
  })
})

describe('showTop', () => {
  function elementAt(top: number) {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => ({ top }) as DOMRect
    element.scrollIntoView = vi.fn()
    return element
  }

  it('scrolls back up when the top of the list is above the screen', () => {
    const element = elementAt(-120)
    showTop(element)
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('leaves the page alone when the top of the list is in view', () => {
    const element = elementAt(40)
    showTop(element)
    expect(element.scrollIntoView).not.toHaveBeenCalled()
  })

  it('does nothing without an element', () => {
    expect(() => showTop(null)).not.toThrow()
  })
})
