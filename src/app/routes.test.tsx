import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

describe('routes', () => {
  it('renders the landing page', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: /one tap away/i })).toBeInTheDocument()
  })

  it('renders a menu for a valid slug', async () => {
    renderAt('/m/cafe-luna')
    expect(await screen.findByRole('heading', { name: 'cafe-luna' })).toBeInTheDocument()
  })

  it.each(['/m/Admin%20Panel', '/m/..%2Fsecret', '/m/ab', '/nope'])('shows not found for %s', async (path) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })
})
