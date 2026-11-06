import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import { renderPage } from './Template.testkit'

const search = copy.menu.view.template.search
const box = () => screen.getByRole('searchbox', { name: search.label })
const live = () => document.querySelector('[aria-live="polite"]') as HTMLElement
const names = () => screen.queryAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
const links = () => within(screen.getByRole('navigation', { name: copy.menu.view.categoriesLabel })).getAllByRole('link').map((link) => link.textContent)

describe('the Daybreak search', () => {
  it('is a search box with a name, inside a search landmark, and it is quiet until something is typed', () => {
    renderPage()
    expect(box()).toHaveAttribute('placeholder', search.placeholder)
    expect(screen.getByRole('search')).toContainElement(box())
    expect(live()).toHaveTextContent('')
    expect(screen.queryByRole('button', { name: search.clear })).toBeNull()
  })

  it('filters the products by name and description as the person types', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(names()).toEqual(['Americano', 'Spanish Latte', 'Iced Caramel Macchiato', 'Cold Brew'])
    await user.type(box(), 'latte')
    expect(names()).toEqual(['Spanish Latte'])
    await user.clear(box())
    await user.type(box(), 'OVERNIGHT')
    expect(names()).toEqual(['Cold Brew'])
  })

  it('finds a word whatever its accents or case', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(box(), 'AMÉRICANO')
    expect(names()).toEqual(['Americano'])
  })

  it('says how many items match, for a screen reader, one and many', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(box(), 'latte')
    expect(live()).toHaveTextContent('1 item found')
    await user.clear(box())
    await user.type(box(), 'ice')
    expect(live()).toHaveTextContent('2 items found')
    await user.clear(box())
    expect(live()).toHaveTextContent('')
  })

  it('does not search for spaces alone', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(box(), '   ')
    expect(names()).toHaveLength(4)
    expect(live()).toHaveTextContent('')
  })

  it('hides the categories that have no match, in the page and in the links, and keeps the ids of the others', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(links()).toEqual(['Hot', 'Iced'])
    await user.type(box(), 'cold brew')
    expect(screen.queryByRole('heading', { level: 2, name: 'Hot' })).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Iced' })).toBeInTheDocument()
    expect(links()).toEqual(['Iced'])
    expect(screen.getByRole('link', { name: 'Iced' })).toHaveAttribute('href', '#daybreak-section-1')
    expect(document.getElementById('daybreak-section-1')).toContainElement(screen.getByRole('heading', { level: 3, name: 'Cold Brew' }))
  })

  it('marks the first category left as the one being read', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(box(), 'cold brew')
    expect(screen.getByRole('link', { name: 'Iced' })).toHaveAttribute('aria-current', 'true')
  })

  it('says so when nothing matches, with what was typed, and draws no links', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(box(), 'pizza ')
    expect(screen.getByText('Nothing on this menu matches "pizza".')).toBeInTheDocument()
    expect(live()).toHaveTextContent('0 items found')
    expect(screen.queryByRole('navigation', { name: copy.menu.view.categoriesLabel })).toBeNull()
    expect(names()).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+63 917 555 0142' })).toBeInTheDocument()
  })

  it('has a clear button while something is typed, which empties the box and brings the whole menu back', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(box(), 'latte')
    const clear = screen.getByRole('button', { name: search.clear })
    expect(clear).toHaveAttribute('type', 'button')
    await user.click(clear)
    expect(box()).toHaveValue('')
    expect(names()).toHaveLength(4)
    expect(screen.queryByRole('button', { name: search.clear })).toBeNull()
    // The button is gone, so the focus goes back to the box instead of being lost.
    expect(box()).toHaveFocus()
  })

  it('clears with Escape, and lets go of the keyboard with Enter', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(box(), 'latte')
    await user.keyboard('{Enter}')
    expect(box()).not.toHaveFocus()
    expect(names()).toEqual(['Spanish Latte'])
    await user.click(box())
    await user.keyboard('{Escape}')
    expect(box()).toHaveValue('')
    expect(names()).toHaveLength(4)
  })

  it('still opens the add-ons of a product in the narrowed list', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(box(), 'espresso and steamed')
    const more = screen.getByRole('button', { name: 'Add-ons for Spanish Latte' })
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
  })
})
