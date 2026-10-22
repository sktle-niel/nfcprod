import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { IconOverview, IconShare } from '../icons'
import { AppShell } from './AppShell'

const items = [
  { to: '/app', end: true, label: 'Home', Icon: IconOverview },
  { to: '/app/share', label: 'Share', Icon: IconShare },
]

function renderShell(path = '/app', props: Partial<Parameters<typeof AppShell>[0]> = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/app/*',
        element: (
          <AppShell label="Area" home="/app" brandLabel="Brand" items={items} skipLabel="Skip it" mainId="area-main" {...props}>
            <p>The page</p>
          </AppShell>
        ),
      },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

describe('AppShell', () => {
  it('names the navigation landmark and lists every item as a link', () => {
    renderShell()
    const nav = screen.getByRole('navigation', { name: 'Area' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Home', 'Share'])
    expect(within(nav).getByRole('link', { name: 'Share' })).toHaveAttribute('href', '/app/share')
  })

  it('marks only the item you are on', () => {
    renderShell('/app/share')
    expect(screen.getByRole('link', { name: 'Share' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('links the brand to home, once in the sidebar and once in the top strip', () => {
    renderShell()
    const brands = screen.getAllByRole('link', { name: 'Brand' })
    expect(brands).toHaveLength(2)
    for (const brand of brands) expect(brand).toHaveAttribute('href', '/app')
  })

  it('has a skip link that points at the main element', () => {
    renderShell()
    const skip = screen.getByRole('link', { name: 'Skip it' })
    expect(skip).toHaveAttribute('href', '#area-main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'area-main')
  })

  it('puts the page inside main', () => {
    renderShell()
    expect(within(screen.getByRole('main')).getByText('The page')).toBeInTheDocument()
  })

  it('has the theme toggle in the top strip', () => {
    renderShell()
    expect(within(screen.getByRole('banner')).getByRole('switch', { name: 'Dark mode' })).toBeInTheDocument()
  })

  it('shows the extra top strip content and the sidebar footer when given', () => {
    renderShell('/app', { topbarExtra: <span>Extra tag</span>, sidebarFooter: <p>Footer note</p> })
    expect(within(screen.getByRole('banner')).getByText('Extra tag')).toBeInTheDocument()
    expect(within(screen.getByRole('complementary')).getByText('Footer note')).toBeInTheDocument()
  })

  it('renders neither extra area when they are left out', () => {
    renderShell()
    expect(within(screen.getByRole('complementary')).queryByText('Footer note')).not.toBeInTheDocument()
    expect(screen.queryByText('Extra tag')).not.toBeInTheDocument()
  })
})
