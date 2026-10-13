export type Paged<T> = {
  rows: T[]
  /** 1-based, and always a page that exists. */
  page: number
  pageCount: number
  /** Position of the first and last row on this page among all rows, 1-based. Both 0 when there are no rows. */
  from: number
  to: number
  total: number
}

/** One page of `items`. A page past the end is brought back to the last one, so a list that shrinks never shows an empty page. */
export function paginate<T>(items: readonly T[], page: number, size: number): Paged<T> {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * size
  const rows = items.slice(start, start + size)
  return { rows, page: current, pageCount, from: rows.length === 0 ? 0 : start + 1, to: start + rows.length, total }
}

/** The page numbers to show, at most seven slots: the first and the last, the current one and its neighbours. A null is a gap. */
export function pageItems(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, null, count]
  if (page >= count - 3) return [1, null, count - 4, count - 3, count - 2, count - 1, count]
  return [1, null, page - 1, page, page + 1, null, count]
}

/** After a page change: bring the top of the list back into view if the reader had scrolled past it. */
export function showTop(element: HTMLElement | null) {
  if (element && element.getBoundingClientRect().top < 0) element.scrollIntoView({ block: 'start' })
}
