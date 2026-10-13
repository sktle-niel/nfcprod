import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

function paged(page: number, pageCount: number, size = 10, total = pageCount * size) {
  const from = (page - 1) * size + 1
  return { page, pageCount, from, to: Math.min(total, page * size), total }
}

describe('Pagination', () => {
  it('is not there when everything fits on one page', () => {
    render(<Pagination paged={paged(1, 1)} onChange={vi.fn()} />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('says which rows are on the page and marks the current page', () => {
    render(<Pagination paged={paged(2, 6, 10, 54)} onChange={vi.fn()} />)
    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    expect(nav).toHaveTextContent('11–20 of 54')
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Page 3' })).not.toHaveAttribute('aria-current')
  })

  it('moves to the page you pick and to the neighbours', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Pagination paged={paged(3, 6)} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Page 5' }))
    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onChange.mock.calls).toEqual([[5], [2], [4]])
  })

  it('cannot go before the first page or past the last', () => {
    const { unmount } = render(<Pagination paged={paged(1, 4)} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
    unmount()

    render(<Pagination paged={paged(4, 4)} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('leaves a gap instead of listing every page of a long list', () => {
    render(<Pagination paged={paged(10, 20)} onChange={vi.fn()} />)
    const pages = screen.getAllByRole('button', { name: /^Page \d+$/ }).map((button) => button.textContent)
    expect(pages).toEqual(['1', '9', '10', '11', '20'])
  })

  it('can show just the arrows and the range, for a narrow list', () => {
    render(<Pagination paged={paged(2, 6, 10, 54)} onChange={vi.fn()} compact />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('11–20 of 54')
    expect(screen.queryByRole('button', { name: /^Page \d+$/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
  })
})
