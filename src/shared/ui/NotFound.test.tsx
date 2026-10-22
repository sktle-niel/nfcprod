import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import { NotFound } from './NotFound'

describe('NotFound', () => {
  it('is a page of its own with a main landmark, a heading and a way home', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: copy.notFound.title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: copy.notFound.home })).toHaveAttribute('href', '/')
  })

  it('inside a shell it draws no main of its own, so the page keeps one main landmark', () => {
    render(
      <MemoryRouter>
        <main>
          <NotFound inline />
        </main>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: copy.notFound.title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: copy.notFound.home })).toBeInTheDocument()
  })
})
