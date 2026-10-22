import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { createMockPublicMenu } from '@/data/publicMenu'
import type { PublicMenu, PublicMenuRepository } from '@/data/publicRepository'
import { MenuPage } from './MenuPage'

const text = copy.menu.page
const samples = createMockPublicMenu({ delay: 0 })

function renderAt(path: string, repository: PublicMenuRepository) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/m/:slug" element={<MenuPage repository={repository} />} />
        <Route path="/" element={<p>Home page</p>} />
        <Route path="*" element={<p>Somewhere else</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** A repository whose answers the test resolves or rejects by hand. */
function manual() {
  const calls: { slug: string; resolve: (value: PublicMenu | null) => void; reject: () => void }[] = []
  const repository: PublicMenuRepository = {
    get: (slug) =>
      new Promise((resolve, reject) => {
        calls.push({ slug, resolve, reject: () => reject(new Error('network')) })
      }),
  }
  return { repository, calls }
}

async function sample(slug: string): Promise<PublicMenu> {
  const found = await samples.get(slug)
  if (!found) throw new Error(`no sample ${slug}`)
  return found
}

describe('the public menu page', () => {
  it('waits quietly: a status line and nothing else, not the app', async () => {
    const { repository, calls } = manual()
    renderAt('/m/cafe-luna', repository)
    expect(screen.getByRole('status')).toHaveTextContent(text.loading)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(calls.map((call) => call.slug)).toEqual(['cafe-luna'])
  })

  it('shows the menu: one h1 with the business name, one main, the categories, the footer, and the business name as the title', async () => {
    renderAt('/m/cafe-luna', samples)
    const title = await screen.findByRole('heading', { level: 1, name: 'Cafe Luna' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(title.closest('main')).toBe(screen.getByRole('main'))
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: copy.menu.view.categoriesLabel })).toBeInTheDocument()
    // The categories are h2 and the products h3: the order of headings has no gap.
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Spanish Latte' })).toBeInTheDocument()
    // Links are live on the public page.
    expect(screen.getByRole('link', { name: '0917 555 0142' })).toHaveAttribute('href', 'tel:09175550142')
    expect(screen.getByText(copy.menu.view.soldOut)).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe('Cafe Luna'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('draws the menu in the style its business chose', async () => {
    const { container, unmount } = renderAt('/m/tea-hub', samples)
    await screen.findByRole('heading', { level: 1, name: 'Tea Hub' })
    const root = container.querySelector('[data-menu-card]')
    expect(root).toHaveAttribute('data-menu-card', 'tile')
    expect(root).toHaveAttribute('data-menu-photo', 'circle')
    unmount()

    const dining = renderAt('/m/la-bella', samples)
    await screen.findByRole('heading', { level: 1, name: 'La Bella' })
    expect(dining.container.querySelector('[data-menu-card]')).toHaveAttribute('data-menu-card', 'plate')
  })

  it('puts the menu in a page of its own colors, set from the checked theme variables only', async () => {
    const { container } = renderAt('/m/bean-there', samples)
    await screen.findByRole('heading', { level: 1, name: 'Bean There' })
    const page = container.querySelector('main')
    expect(page?.getAttribute('style')).toContain('--menu-bg')
    expect(page?.getAttribute('style')).not.toMatch(/url\(|expression|javascript/i)
  })

  it('says calmly that a menu is not available, with a way home, and is not the 404 of the app', async () => {
    renderAt('/m/nobody-here', samples)
    expect(await screen.findByRole('heading', { level: 1, name: text.notAvailable.title })).toBeInTheDocument()
    expect(screen.getByText(text.notAvailable.body)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: text.notAvailable.home })).toHaveAttribute('href', '/')
    expect(screen.queryByText(copy.notFound.title)).not.toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe(text.notAvailable.title))
  })

  it.each(['/m/Admin%20Panel', '/m/..%2Fsecret', '/m/ab', '/m/admin'])('checks the slug before anything else: %s asks nobody', (path) => {
    const get = vi.fn<PublicMenuRepository['get']>(() => Promise.resolve(null))
    renderAt(path, { get })
    expect(screen.getByRole('heading', { name: copy.notFound.title })).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })

  it('says it could not load, retries, and puts the focus on the menu name when the menu arrives', async () => {
    const user = userEvent.setup()
    const { repository, calls } = manual()
    renderAt('/m/cafe-luna', repository)
    calls[0]?.reject()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(text.error.message)
    expect(screen.getByRole('heading', { level: 1, name: text.error.title })).toBeInTheDocument()
    await waitFor(() => expect(document.title).toBe(text.error.title))

    await user.click(screen.getByRole('button', { name: text.error.retry }))
    // While the retry runs the page stays, the button keeps the focus' place and a status line says it is loading.
    expect(calls).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent(text.loading)
    expect(screen.getByRole('button', { name: text.error.retry })).toHaveAttribute('aria-busy', 'true')

    calls[1]?.resolve(await sample('cafe-luna'))
    const title = await screen.findByRole('heading', { level: 1, name: 'Cafe Luna' })
    await waitFor(() => expect(title).toHaveFocus())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers Retry again when the retry fails too', async () => {
    const user = userEvent.setup()
    const { repository, calls } = manual()
    renderAt('/m/cafe-luna', repository)
    calls[0]?.reject()
    await user.click(await screen.findByRole('button', { name: text.error.retry }))
    calls[1]?.reject()
    expect(await screen.findByRole('alert')).toHaveTextContent(text.error.message)
    expect(screen.getByRole('button', { name: text.error.retry })).not.toHaveAttribute('aria-busy')
  })

  it('works against the demo repository as the app wires it (no repository given)', async () => {
    render(
      <MemoryRouter initialEntries={['/m/kapehan-ni-ana']}>
        <Routes>
          <Route path="/m/:slug" element={<MenuPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Kapehan ni Ana' }, { timeout: 5000 })).toBeInTheDocument()
  })
})
