import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { sampleBusiness } from '@/test/ownerFixtures'
import { menuWith, plainProduct, renderPage } from './Template.testkit'
import { words } from './words'

const text = copy.menu.view
const site = text.template.siteNav
const NO_CONTACT = { phone: '', address: '', hours: '', social: { facebook: '', instagram: '', tiktok: '', website: '' } }
const FOCUSABLE = 'a, button, input, select, textarea, [tabindex]'
const SIZES = /S\s₱165 · M\s₱185 · L\s₱205/

const rowOf = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement
const toggleOf = (name: string) => screen.queryByRole('button', { name: `Add-ons for ${name}` })
const panelOf = (button: HTMLElement) => document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement
const categories = () => within(screen.getByRole('navigation', { name: text.categoriesLabel })).getAllByRole('link')

/** An observer that has started and says nothing yet. */
class QuietObserver {
  observe() {}
  disconnect() {}
}
/** jsdom reports calm motion and lays nothing out: these say otherwise, for the tests of the entrance. */
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false }))
const measuredBelowTheScreen = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect)

const originalScroll = Element.prototype.scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  Element.prototype.scrollIntoView = originalScroll
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the Daybreak page: structure', () => {
  it('draws the shop as the page heading, each category as a heading and each item as a heading', () => {
    renderPage()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Hot', 'Iced', text.template.visit.heading])
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Americano', 'Spanish Latte', 'Iced Caramel Macchiato', 'Cold Brew'])
  })

  it('steps every heading down one level when the page sits inside another', () => {
    renderPage({ tags: { name: 'h2', category: 'h3', product: 'h4' } })
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Americano' })).toBeInTheDocument()
  })

  it('draws no main or banner landmark, which the page around it has', () => {
    renderPage()
    expect(screen.queryByRole('main')).toBeNull()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('lists the items of each category in a list, each one in a list item', () => {
    renderPage()
    for (const name of ['Americano', 'Spanish Latte', 'Iced Caramel Macchiato', 'Cold Brew']) expect(rowOf(name).parentElement?.tagName).toBe('UL')
    expect(rowOf('Americano').parentElement).toBe(rowOf('Spanish Latte').parentElement)
    expect(rowOf('Americano').parentElement).not.toBe(rowOf('Cold Brew').parentElement)
  })

  it('gives every section its category as its name when it is a page, and no landmark when it is not', () => {
    const page = renderPage()
    expect(screen.getByRole('region', { name: 'Hot' })).toHaveAttribute('id', 'daybreak-section-0')
    expect(screen.getByRole('region', { name: 'Iced' })).toHaveAttribute('id', 'daybreak-section-1')
    page.unmount()
    renderPage({ interactive: false })
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' }).closest('section')).toHaveAttribute('id', 'daybreak-section-0')
  })

  it('keeps the section ids it is given, in menu order', () => {
    renderPage({ idOf: (index) => `menu-x-${index}` })
    expect(document.getElementById('menu-x-0')).toContainElement(screen.getByRole('heading', { level: 2, name: 'Hot' }))
    expect(document.getElementById('menu-x-1')).toContainElement(screen.getByRole('heading', { level: 2, name: 'Iced' }))
    expect(categories().map((link) => link.getAttribute('href'))).toEqual(['#menu-x-0', '#menu-x-1'])
  })

  it.each(['list', 'grid'] as const)('marks the %s layout on the page and draws the same rows in it', (layout) => {
    const { container } = renderPage({ layout })
    expect(container.firstElementChild).toHaveAttribute('data-layout', layout)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
    expect(rowOf('Cold Brew').textContent).toContain('₱150')
    expect(within(rowOf('Spanish Latte')).getByText(SIZES)).toBeInTheDocument()
    // The leader stays in the row: the stylesheet takes it out of a grid.
    expect(screen.getByRole('heading', { level: 3, name: 'Cold Brew' }).nextElementSibling).toHaveAttribute('aria-hidden', 'true')
  })

  it.each(['light', 'dark'] as const)('marks the %s mode on the page, which decides how a picture is printed', (mode) => {
    const business = sampleBusiness()
    const { container } = renderPage({ business: { ...business, theme: { ...business.theme, mode } } })
    expect(container.firstElementChild).toHaveAttribute('data-mode', mode)
  })
})

describe('the Daybreak page: the top', () => {
  it('sets the name of the shop as type and prints the tagline under it', () => {
    renderPage()
    const name = screen.getByRole('heading', { level: 1, name: 'Kape Kanto' })
    expect(name).toHaveAttribute('data-size', 'l')
    expect(name.parentElement?.textContent).toBe('Kape KantoCoffee and pastries on the corner')
  })

  it('draws no empty line for a shop with no tagline', () => {
    renderPage({ business: sampleBusiness({ tagline: '' }) })
    const name = screen.getByRole('heading', { level: 1, name: 'Kape Kanto' })
    expect(name.parentElement?.querySelector('p')).toBeNull()
  })

  it.each([
    ['Kape Kanto', 'l'],
    ['Panaderia Cebuana', 'm'],
    ['Kape sa Kanto ng Mabini at Rizal', 's'],
    ['Supercalifragilistic', 's'],
  ])('sets "%s" at size %s, so a long name fits the sheet', (name, size) => {
    renderPage({ business: sampleBusiness({ name }) })
    expect(screen.getByRole('heading', { level: 1, name })).toHaveAttribute('data-size', size)
  })

  it('draws no letter or picture for a shop with no logo, and the logo as decoration when there is one', () => {
    const page = renderPage()
    expect(page.container.querySelector('img:not([src*="spanish-latte"])')).toBeNull()
    expect(screen.queryByText('K')).toBeNull()
    page.unmount()
    const { container } = renderPage({ business: sampleBusiness({ logo: '/sample/cup-1.jpg' }) })
    expect(container.querySelector('img[src="/sample/cup-1.jpg"]')).toHaveAttribute('alt', '')
  })

  it('draws the logo only when it is an address the page may show', () => {
    const { container } = renderPage({ business: sampleBusiness({ logo: 'https://evil.example.com/logo.png' }) })
    expect(container.querySelector('img[src="https://evil.example.com/logo.png"]')).toBeNull()
  })
})

describe('the Daybreak page: the top navigation', () => {
  const nav = () => screen.getByRole('navigation', { name: site.label })

  it('links to the menu and to the Visit section with real links', () => {
    renderPage()
    expect(within(nav()).getAllByRole('link').map((link) => link.textContent)).toEqual([site.menu, site.visit])
    expect(within(nav()).getByRole('link', { name: site.menu })).toHaveAttribute('href', '#daybreak-section-0-menu')
    expect(within(nav()).getByRole('link', { name: site.visit })).toHaveAttribute('href', '#daybreak-section-0-visit')
  })

  it('scrolls to its place on a tap and hands focus to it', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(within(nav()).getByRole('link', { name: site.visit }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledOnce()
    expect(screen.getByRole('region', { name: text.template.visit.heading })).toHaveFocus()
    await user.click(within(nav()).getByRole('link', { name: site.menu }))
    expect(document.getElementById('daybreak-section-0-menu')).toHaveFocus()
  })

  it('is not drawn for a shop with nothing to visit: a lone link to what is right below it would be noise', () => {
    renderPage({ business: sampleBusiness(NO_CONTACT) })
    expect(screen.queryByRole('navigation', { name: site.label })).toBeNull()
  })
})

describe('the Daybreak page: the Visit section', () => {
  const visit = () => screen.getByRole('region', { name: text.template.visit.heading })

  it('closes the page after the menu, one level below the name of the shop', () => {
    renderPage()
    expect(within(visit()).getByRole('heading', { level: 2, name: text.template.visit.heading })).toBeInTheDocument()
    const sections = screen.getAllByRole('region')
    expect(sections[sections.length - 1]).toBe(visit())
  })

  it('prints the hours and the address, with a Directions link that opens apart from the menu', () => {
    renderPage()
    expect(visit()).toHaveTextContent('Mon to Fri, 7 am to 9 pm')
    expect(visit()).toHaveTextContent('12 Mabini Street, Lahug, Cebu City')
    const directions = within(visit()).getByRole('link', { name: text.template.visit.directionsLabel })
    expect(directions.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=12%20Mabini%20Street%2C%20Lahug%2C%20Cebu%20City')
    expect(directions).toHaveAttribute('target', '_blank')
    expect(directions).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('offers a tap to call, once on the page, and the social links', () => {
    renderPage()
    expect(within(visit()).getByRole('link', { name: '+63 917 555 0142' })).toHaveAttribute('href', 'tel:+639175550142')
    expect(document.querySelectorAll('a[href^="tel:"]')).toHaveLength(1)
    expect(within(visit()).getByRole('link', { name: text.social.facebook })).toHaveAttribute('href', 'https://facebook.com/kapekanto')
    expect(within(visit()).getByRole('link', { name: text.social.instagram })).toHaveAttribute('href', 'https://instagram.com/kapekanto')
  })

  it('leaves out each fact with no data, and keeps the rest', () => {
    renderPage({ business: sampleBusiness({ phone: '', address: '' }) })
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(screen.queryByText(text.footer.address)).toBeNull()
    expect(screen.queryByRole('link', { name: text.template.visit.directionsLabel })).toBeNull()
    expect(visit()).toHaveTextContent('Mon to Fri, 7 am to 9 pm')
    expect(screen.getByRole('navigation', { name: site.label })).toBeInTheDocument()
  })

  it('draws no empty section for a shop with no contact lines', () => {
    renderPage({ business: sampleBusiness(NO_CONTACT) })
    expect(screen.queryByRole('region', { name: text.template.visit.heading })).toBeNull()
    expect(screen.queryByRole('heading', { name: text.template.visit.heading })).toBeNull()
    expect(screen.queryByRole('contentinfo')).toBeNull()
  })
})

describe('the Daybreak page: motion', () => {
  it('holds nothing back where no observer is available: every section is there from the start', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    motionAllowed()
    measuredBelowTheScreen()
    renderPage()
    expect(document.querySelector('[data-reveal]')).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: 'Cold Brew' })).toBeInTheDocument()
  })

  it('lets each section and the Visit section itself, the target of its link, ease in as they arrive', () => {
    vi.stubGlobal('IntersectionObserver', QuietObserver)
    motionAllowed()
    measuredBelowTheScreen()
    renderPage()
    const waiting = [...document.querySelectorAll('[data-reveal="waiting"]')].map(({ id }) => id)
    expect(waiting).toEqual(['daybreak-section-0', 'daybreak-section-1', 'daybreak-section-0-visit'])
  })

  it('settles the Visit section when its link is tapped, so the jump lands where it should', async () => {
    vi.stubGlobal('IntersectionObserver', QuietObserver)
    motionAllowed()
    measuredBelowTheScreen()
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('link', { name: site.visit }))
    expect(document.getElementById('daybreak-section-0-visit')).not.toHaveAttribute('data-reveal')
  })

  it('opens with the name, then the tagline, then the rest, on the public page only', () => {
    const page = renderPage()
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('opening')
    expect(screen.getByText('Coffee and pastries on the corner').className).toContain('afterOne')
    expect(screen.getByRole('navigation', { name: text.categoriesLabel }).className).toContain('afterTwo')
    page.unmount()
    renderPage({ interactive: false })
    expect(document.querySelector('[class*="opening"], [class*="after"], [class*="press"], [class*="fades"]')).toBeNull()
  })

  it('waits for nothing in the preview, even where motion and an observer are there', () => {
    vi.stubGlobal('IntersectionObserver', QuietObserver)
    motionAllowed()
    measuredBelowTheScreen()
    renderPage({ interactive: false })
    expect(document.querySelector('[data-reveal]')).toBeNull()
  })

  it('marks a picture once it has loaded, or failed, so the fade never leaves it waiting', () => {
    renderPage()
    const picture = rowOf('Spanish Latte').querySelector('img') as HTMLImageElement
    expect(picture.className).toContain('fades')
    expect(picture).not.toHaveAttribute('data-decoded')
    fireEvent.load(picture)
    expect(picture).toHaveAttribute('data-decoded')
  })
})

describe('the Daybreak page: a row', () => {
  it('prints the lowest price by the name, with no "From", and every size under it without opening anything', () => {
    renderPage()
    const latte = rowOf('Spanish Latte')
    expect(screen.getByRole('heading', { level: 3, name: 'Spanish Latte' }).parentElement?.textContent).toBe('Spanish Latte₱165')
    expect(within(latte).getByText(SIZES)).toBeVisible()
    expect(latte.textContent).not.toContain(text.from)
    expect(rowOf('Cold Brew').textContent).toContain('₱150')
    expect(rowOf('Cold Brew').textContent).not.toContain('S ₱')
  })

  it('draws dotted leaders from the name to the price, hidden from readers', () => {
    renderPage()
    const leader = screen.getByRole('heading', { level: 3, name: 'Americano' }).nextElementSibling
    expect(leader).toHaveAttribute('aria-hidden', 'true')
    expect(leader).toBeEmptyDOMElement()
  })

  it('prints the description in full, and nothing for an empty one', () => {
    const long = 'Black tea, hot. '.repeat(40).trim()
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Plain Tea', description: long }), plainProduct('p-b', 'cat-hot', { name: 'Bare Tea' })]) })
    expect(within(rowOf('Plain Tea')).getByText(long)).toBeInTheDocument()
    expect(rowOf('Bare Tea').querySelectorAll('p')).toHaveLength(0)
  })

  it('prints the tags as words, the best seller with a star beside the word and the others without', () => {
    renderPage()
    const best = within(rowOf('Spanish Latte')).getByText(text.tags.bestSeller)
    expect(best.closest('li')?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    const fresh = within(rowOf('Iced Caramel Macchiato')).getByText(text.tags.new)
    expect(fresh.closest('li')?.querySelector('svg')).toBeNull()
    expect(within(rowOf('Cold Brew')).getByText(text.tags.vegan)).toBeInTheDocument()
    expect(within(rowOf('Americano')).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('says sold out in words and marks only that row, so its stylesheet can quiet the picture', () => {
    renderPage()
    expect(screen.getAllByText(text.soldOut)).toHaveLength(1)
    expect(within(rowOf('Iced Caramel Macchiato')).getByText(text.soldOut)).toBeInTheDocument()
    expect(rowOf('Iced Caramel Macchiato')).toHaveAttribute('data-sold-out')
    expect(rowOf('Cold Brew')).not.toHaveAttribute('data-sold-out')
  })

  it('draws the picture as decoration', () => {
    renderPage()
    const picture = rowOf('Spanish Latte').querySelector('img')
    expect(picture).toHaveAttribute('src', 'https://images.example.com/spanish-latte.jpg')
    expect(picture).toHaveAttribute('alt', '')
    expect(rowOf('Spanish Latte')).toHaveAttribute('data-photo')
  })

  it('draws no image, no drawing and no empty frame for a row with no photo', () => {
    const placeholderOf = vi.fn(() => 'cup' as const)
    renderPage({ placeholderOf })
    const row = rowOf('Americano')
    expect(row).not.toHaveAttribute('data-photo')
    expect(row.querySelector('img, svg, [data-placeholder]')).toBeNull()
    // The head and the text, with no box for a picture beside the text.
    expect(screen.getByRole('heading', { level: 3, name: 'Americano' }).parentElement).toBe(row.firstElementChild)
    expect(row.children).toHaveLength(2)
    expect(row.lastElementChild?.children).toHaveLength(1)
    expect(placeholderOf).not.toHaveBeenCalled()
  })

  it('asks for the picture of a product through photoOf, so an address the page may not show is never drawn', () => {
    const photoOf = vi.fn(() => null)
    renderPage({ photoOf })
    expect(photoOf).toHaveBeenCalled()
    expect(document.querySelector('img')).toBeNull()
  })

  it('loads the first four pictures of the first category at once and leaves the rest until they scroll into view', () => {
    const pictured = (id: string, categoryId: string) => plainProduct(id, categoryId, { image: `https://images.example.com/${id}.jpg` })
    renderPage({ menu: menuWith([...['a', 'b', 'c', 'd', 'e'].map((id) => pictured(id, 'cat-hot')), pictured('f', 'cat-iced')]) })
    expect([...document.querySelectorAll('img')].map((image) => image.getAttribute('loading'))).toEqual(['eager', 'eager', 'eager', 'eager', 'lazy', 'lazy'])
  })

  it.each(['list', 'grid'] as const)('prints a long name and a long unbroken word whole in the %s layout (wrapping is the stylesheet)', (layout) => {
    const name = 'Extra Long Caramel Cookie Crumble Frappuccino With Whipped Cream ' + 'x'.repeat(40)
    renderPage({ layout, menu: menuWith([plainProduct('p-a', 'cat-hot', { name, groupIds: ['grp-milk'] })]) })
    expect(screen.getByRole('heading', { level: 3, name })).toHaveTextContent(name)
    expect(rowOf(name).textContent).toContain('₱100')
    expect(toggleOf(name)).toBeInTheDocument()
  })
})

describe('the Daybreak page: the add-ons', () => {
  it('can be opened only on a product with add-ons, not on one with sizes alone', () => {
    renderPage()
    expect(toggleOf('Spanish Latte')).toBeInTheDocument()
    expect(toggleOf('Iced Caramel Macchiato')).toBeInTheDocument()
    expect(toggleOf('Americano')).toBeNull()
    expect(toggleOf('Cold Brew')).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Add-ons for / })).toHaveLength(2)
  })

  it('cannot be opened when the group of a product is not on the menu', () => {
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Lost Tea', groupIds: ['grp-gone'] })]) })
    expect(toggleOf('Lost Tea')).toBeNull()
  })

  it('open under a plain text control and close again, saying so with aria-expanded', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = toggleOf('Spanish Latte') as HTMLElement
    const panel = panelOf(button)
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveTextContent(words.addOns)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toHaveAttribute('data-open')
    expect(panel).toHaveAttribute('inert')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveAttribute('data-open')
    expect(panel).not.toHaveAttribute('inert')
    expect(within(panel).getByText('Milk')).toBeInTheDocument()
    expect(panel).toHaveTextContent('Oat milk +₱45 · Soy milk +₱35')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toHaveAttribute('data-open')
    expect(panel).toHaveAttribute('inert')
  })

  it('do not repeat the sizes, which are already printed on the row', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = toggleOf('Spanish Latte') as HTMLElement
    await user.click(button)
    expect(within(panelOf(button)).queryByText(text.template.sizes)).toBeNull()
    expect(within(rowOf('Spanish Latte')).getAllByText(SIZES)).toHaveLength(1)
  })

  it('open on one product without touching the others', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(toggleOf('Spanish Latte') as HTMLElement)
    expect(toggleOf('Spanish Latte')).toHaveAttribute('aria-expanded', 'true')
    expect(toggleOf('Iced Caramel Macchiato')).toHaveAttribute('aria-expanded', 'false')
  })

  it('are named for their product, with the name printed as it is', () => {
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Spicy $& Co', groupIds: ['grp-milk'] })]) })
    expect(screen.getByRole('button', { name: 'Add-ons for Spicy $& Co' })).toBeInTheDocument()
  })
})

describe('the Daybreak page: the category links', () => {
  it('are links in a navigation landmark, one for each category, in menu order', () => {
    renderPage()
    expect(categories().map((link) => link.textContent)).toEqual(['Hot', 'Iced'])
    expect(categories().map((link) => link.getAttribute('href'))).toEqual(['#daybreak-section-0', '#daybreak-section-1'])
  })

  it('mark the first category as the one being read', () => {
    renderPage()
    const [hot, iced] = categories()
    expect(hot).toHaveAttribute('aria-current', 'true')
    expect(hot).toHaveAttribute('data-selected')
    expect(iced).not.toHaveAttribute('aria-current')
    expect(iced).not.toHaveAttribute('data-selected')
  })

  it('scroll to their section on a tap, and hand focus to it', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('link', { name: 'Iced' }))
    const section = document.getElementById('daybreak-section-1')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(section).toHaveAttribute('tabindex', '-1')
    expect(section).toHaveFocus()
  })
})

describe('the Daybreak page in the Design preview', () => {
  it('draws no link, button, input or tab stop, and no navigation or search landmark', () => {
    const { container } = renderPage({ interactive: false })
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('search')).toBeNull()
    expect(screen.queryByRole('region')).toBeNull()
  })

  it('prints the Visit section with its facts as text, and keeps the ids the frame scrolls to', () => {
    renderPage({ interactive: false })
    expect(document.getElementById('daybreak-section-0-visit')?.tagName).toBe('DIV')
    expect(document.getElementById('daybreak-section-0-menu')).not.toBeNull()
    expect(screen.getByText('+63 917 555 0142').tagName).toBe('P')
    expect(screen.getByText(text.social.facebook).tagName).toBe('SPAN')
    expect(screen.queryByText(text.template.visit.directions)).toBeNull()
  })

  it('prints the top navigation as text that still scrolls the frame', async () => {
    const user = userEvent.setup()
    const { container } = renderPage({ interactive: false })
    const scrollTo = vi.fn()
    container.style.overflowY = 'auto'
    container.scrollTo = scrollTo
    await user.click(screen.getByText(site.visit, { selector: 'span' }))
    expect(scrollTo).toHaveBeenCalledOnce()
  })

  it('draws the search as a look-alike with the same words, and the categories as plain text with the same look', () => {
    renderPage({ interactive: false })
    expect(screen.getByText(text.template.search.placeholder)).toBeInTheDocument()
    expect(screen.getByText('Iced', { selector: 'span' })).toBeInTheDocument()
    expect(document.querySelector('[data-selected]')?.textContent).toBe('Hot')
    expect(document.querySelector('[aria-current]')).toBeNull()
  })

  it('still prints the words of the add-ons where a product has them, as text with nothing to open', () => {
    renderPage({ interactive: false })
    const row = rowOf('Spanish Latte')
    expect(within(row).getByText(words.addOns)).toBeInTheDocument()
    expect(row.querySelector('[inert], [aria-expanded]')).toBeNull()
    expect(within(rowOf('Cold Brew')).queryByText(words.addOns)).toBeNull()
  })

  it('steps the headings down too', () => {
    renderPage({ interactive: false, tags: { name: 'h2', category: 'h3', product: 'h4' } })
    expect(screen.getByRole('heading', { level: 2, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Americano' })).toBeInTheDocument()
  })

  it('scrolls the frame alone when a category is tapped, and takes no focus', async () => {
    const user = userEvent.setup()
    const { container } = renderPage({ interactive: false })
    const scrollTo = vi.fn()
    container.style.overflowY = 'auto'
    container.scrollTo = scrollTo
    const category = screen.getByText('Iced', { selector: 'span' })
    await user.click(category)
    expect(scrollTo).toHaveBeenCalledOnce()
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
    expect(category).not.toHaveFocus()
    expect(document.getElementById('daybreak-section-1')).not.toHaveAttribute('tabindex')
  })
})

describe('the Daybreak page: free text', () => {
  it('prints names, taglines, descriptions and categories as text and builds no element from them', () => {
    const attack = '<img src=x onerror=alert(1)>'
    const menu = menuWith([plainProduct('p-a', 'cat-hot', { name: attack, description: '<b>bold</b><script>alert(2)</script>' })])
    menu.categories[0] = { id: 'cat-hot', name: '<i>Hot</i>', visible: true }
    const business = sampleBusiness({ name: '<u>Kape</u> Kanto', tagline: '<script>alert(3)</script> two words' })
    const { container } = renderPage({ menu, business })
    expect(container.querySelector('script, b, i, u, img[src="x"]')).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: attack })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '<i>Hot</i>' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '<u>Kape</u> Kanto' })).toBeInTheDocument()
    expect(screen.getByText('<b>bold</b><script>alert(2)</script>')).toBeInTheDocument()
    expect(screen.getByText('<script>alert(3)</script> two words')).toBeInTheDocument()
  })

  it('prints the typed search back inside the "nothing matches" line as text', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()
    await user.type(screen.getByRole('searchbox'), '<b>x</b>')
    expect(container.querySelector('b')).toBeNull()
    expect(screen.getByText('Nothing on this menu matches "<b>x</b>".')).toBeInTheDocument()
  })
})
