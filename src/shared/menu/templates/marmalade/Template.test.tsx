import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { sampleBusiness } from '@/test/ownerFixtures'
import { motion } from '../kit'
import { menuWith, plainProduct, renderPage } from './Template.testkit'

const text = copy.menu.view
const NO_CONTACT = { phone: '', address: '', hours: '', social: { facebook: '', instagram: '', tiktok: '', website: '' } }
const WITH_SOCIAL = { facebook: 'https://facebook.com/kapekanto', instagram: '', tiktok: '', website: '' }
const FOCUSABLE = 'a, button, input, select, textarea, [tabindex]'

const rowOf = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement
const addOnsOf = (name: string) => screen.queryByRole('button', { name: `Add-ons for ${name}` })

afterEach(() => vi.restoreAllMocks())

describe('the Marmalade page: structure', () => {
  it('draws the name of the shop, each category and each item as headings', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Iced' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Americano' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Cold Brew' })).toBeInTheDocument()
  })

  it('steps every heading down one level when the page sits inside another', () => {
    renderPage({ tags: { name: 'h2', category: 'h3', product: 'h4' } })
    expect(screen.getByRole('heading', { level: 2, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Americano' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('draws no main or banner landmark, which the page around it has', () => {
    renderPage()
    expect(screen.queryByRole('main')).toBeNull()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('lists the items in a list, each one in a list item', () => {
    renderPage()
    for (const name of ['Americano', 'Spanish Latte', 'Iced Caramel Macchiato', 'Cold Brew']) expect(rowOf(name).parentElement?.tagName).toBe('UL')
  })

  it('names every section after its category on the page, and adds no landmark in the preview', () => {
    const page = renderPage()
    expect(screen.getByRole('region', { name: 'Hot' })).toHaveAttribute('id', 'marmalade-section-0')
    expect(screen.getByRole('region', { name: 'Iced' })).toHaveAttribute('id', 'marmalade-section-1')
    page.unmount()
    renderPage({ interactive: false })
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' }).closest('section')).toHaveAttribute('id', 'marmalade-section-0')
  })

  it.each(['list', 'grid'] as const)('marks the %s layout on the page and the mode beside it, so the stylesheets can switch', (layout) => {
    const { container } = renderPage({ layout })
    expect(container.firstElementChild).toHaveAttribute('data-layout', layout)
    expect(container.firstElementChild).toHaveAttribute('data-mode', sampleBusiness().theme.mode)
  })

  it('has no search, no call button and no ordering controls: only what a good old sign has', () => {
    renderPage()
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('link', { name: /^Call/ })).toBeNull()
    expect(screen.getAllByRole('button').every((button) => button.textContent === 'Add-ons')).toBe(true)
  })

})

describe('the Marmalade page: the top links', () => {
  it('links the menu and the Visit section from a named navigation, each landing where it says', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const user = userEvent.setup()
    renderPage()
    const nav = screen.getByRole('navigation', { name: text.template.siteNav.label })
    expect(within(nav).getByRole('link', { name: text.template.siteNav.menu })).toHaveAttribute('href', '#marmalade-section-0')
    const visit = within(nav).getByRole('link', { name: text.template.siteNav.visit })
    expect(visit).toHaveAttribute('href', '#marmalade-section-2')
    await user.click(visit)
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(document.activeElement).toHaveAttribute('id', 'marmalade-section-2')
  })

  it('leaves them out for a shop with no Visit section: the menu starts right under the sign', () => {
    renderPage({ business: sampleBusiness(NO_CONTACT) })
    expect(screen.queryByRole('navigation', { name: text.template.siteNav.label })).toBeNull()
  })
})

describe('the Marmalade page: the Visit section', () => {
  it('is a named region after the menu, a level under the shop name, with the phone to tap', () => {
    renderPage()
    const visit = screen.getByRole('region', { name: text.template.visit.heading })
    expect(within(visit).getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(within(visit).getByRole('link', { name: sampleBusiness().phone })).toHaveAttribute('href', 'tel:+639175550142')
    expect(within(visit).getByText('12 Mabini Street, Lahug, Cebu City')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Iced' }).compareDocumentPosition(visit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('offers directions that leave the page safely, and the social links', () => {
    renderPage({ business: sampleBusiness({ social: WITH_SOCIAL }) })
    const directions = screen.getByRole('link', { name: text.template.visit.directionsLabel })
    expect(directions.getAttribute('href')).toContain(encodeURIComponent('12 Mabini Street'))
    expect(directions).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: text.social.facebook })).toHaveAttribute('href', 'https://facebook.com/kapekanto')
  })

  it('draws only the lines it has: no address means no address and no directions', () => {
    renderPage({ business: sampleBusiness({ address: '' }) })
    expect(screen.queryByText(text.footer.address)).toBeNull()
    expect(screen.queryByRole('link', { name: text.template.visit.directionsLabel })).toBeNull()
    expect(screen.getByText(text.footer.phone)).toBeInTheDocument()
  })

  it('draws nothing at all for a business with no contact lines', () => {
    renderPage({ business: sampleBusiness(NO_CONTACT) })
    expect(screen.queryByRole('heading', { name: text.template.visit.heading })).toBeNull()
  })
})

describe('the Marmalade page: the sign', () => {
  it('sets the name as type with the tagline under it, and no letter mark for a shop with no logo', () => {
    const { container } = renderPage()
    expect(screen.getByText('Coffee and pastries on the corner').tagName).toBe('P')
    expect(screen.queryByText('K')).toBeNull()
    expect(container.querySelector('img[src*="logo"]')).toBeNull()
  })

  it('draws no empty line for a shop with no tagline', () => {
    const { container } = renderPage({ business: sampleBusiness({ tagline: '' }) })
    const sign = screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement
    expect(sign.querySelector('p')).toBeNull()
    expect(container.firstElementChild).not.toBeNull()
  })

  it('paints the logo above the name, only from an address the page may show', () => {
    const page = renderPage({ business: sampleBusiness({ logo: '/sample/cup-1.jpg' }) })
    expect(page.container.querySelector('img[src="/sample/cup-1.jpg"]')).toHaveAttribute('alt', '')
    page.unmount()
    const refused = renderPage({ business: sampleBusiness({ logo: 'https://evil.example.com/logo.png' }) })
    expect(refused.container.querySelector('img[src*="evil"]')).toBeNull()
  })

  it.each([
    ['Kape Kanto', 'l'],
    ['Karinderyang Masarap', 'm'],
    ['Panaderya ni Aling Nena at mga Anak', 's'],
    ['Pinakamasarapnakarinderya', 's'],
  ])('sizes the lettering of %s to fit the wall (%s)', (name, size) => {
    renderPage({ business: sampleBusiness({ name }) })
    expect(screen.getByRole('heading', { level: 1, name })).toHaveAttribute('data-size', size)
  })
})

describe('the Marmalade page: the tabs', () => {
  it('links every category from a named navigation, and marks the first as the one being read', () => {
    renderPage()
    const nav = screen.getByRole('navigation', { name: text.categoriesLabel })
    const hot = within(nav).getByRole('link', { name: 'Hot' })
    const iced = within(nav).getByRole('link', { name: 'Iced' })
    expect(hot).toHaveAttribute('href', '#marmalade-section-0')
    expect(hot).toHaveAttribute('aria-current', 'true')
    expect(iced).toHaveAttribute('href', '#marmalade-section-1')
    expect(iced).not.toHaveAttribute('aria-current')
  })

  it('goes to the board on a tap and hands it the focus, without touching the address', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const user = userEvent.setup()
    renderPage()
    const before = window.location.href
    await user.click(screen.getByRole('link', { name: 'Iced' }))
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(document.activeElement).toHaveAttribute('id', 'marmalade-section-1')
    expect(window.location.href).toBe(before)
  })

  it('jumps instead of gliding when the person asked for calm motion', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('link', { name: 'Iced' }))
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    vi.unstubAllGlobals()
  })
})

describe('the Marmalade page: the rows', () => {
  it('shows one price at the right for a plain product, and every size with its own price for one with sizes', () => {
    renderPage()
    expect(rowOf('Cold Brew').textContent).toContain('₱150')
    const sizes = within(rowOf('Spanish Latte')).getAllByRole('listitem').filter((item) => item.textContent?.includes('₱'))
    expect(sizes.length).toBeGreaterThan(1)
    expect(rowOf('Spanish Latte').textContent).not.toContain(text.from)
  })

  it('prints the description in full, and nothing for an empty one', () => {
    const long = 'Black tea, hot, with a slice of calamansi and a spoon of muscovado sugar, the way the house has always made it.'
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Plain Tea', description: long }), plainProduct('p-b', 'cat-hot', { name: 'Bare Tea' })]) })
    expect(within(rowOf('Plain Tea')).getByText(long)).toBeInTheDocument()
    expect(rowOf('Bare Tea').querySelector('p')).toBeNull()
  })

  it('shows the tags as words', () => {
    renderPage()
    expect(within(rowOf('Spanish Latte')).getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(within(rowOf('Iced Caramel Macchiato')).getByText(text.tags.new)).toBeInTheDocument()
    expect(within(rowOf('Cold Brew')).getByText(text.tags.vegan)).toBeInTheDocument()
  })

  it('says sold out in words, and marks only that row', () => {
    renderPage()
    expect(within(rowOf('Iced Caramel Macchiato')).getByText(text.soldOut)).toBeInTheDocument()
    expect(rowOf('Iced Caramel Macchiato')).toHaveAttribute('data-sold-out')
    expect(rowOf('Americano')).not.toHaveAttribute('data-sold-out')
    expect(within(rowOf('Americano')).queryByText(text.soldOut)).toBeNull()
  })

  it('draws a picture as decoration, and a row with no picture as plain lettering: no image and no drawn stand-in', () => {
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'With', image: '/sample/cup-1.jpg' }), plainProduct('p-b', 'cat-hot', { name: 'Without' })]) })
    expect(rowOf('With').querySelector('img')).toHaveAttribute('alt', '')
    expect(rowOf('With')).toHaveAttribute('data-photo')
    expect(rowOf('Without')).not.toHaveAttribute('data-photo')
    expect(rowOf('Without').querySelector('img, svg')).toBeNull()
  })

  it('loads the first pictures of the first board at once and the others as they scroll in', () => {
    const products = ['a', 'b', 'c', 'd', 'e'].map((id) => plainProduct(id, 'cat-hot', { image: '/sample/cup-1.jpg' }))
    renderPage({ menu: menuWith([...products, plainProduct('f', 'cat-iced', { image: '/sample/cup-1.jpg' })]) })
    expect(rowOf('a').querySelector('img')).toHaveAttribute('loading', 'eager')
    expect(rowOf('e').querySelector('img')).toHaveAttribute('loading', 'lazy')
    expect(rowOf('f').querySelector('img')).toHaveAttribute('loading', 'lazy')
  })
})

describe('the Marmalade page: add-ons', () => {
  it('offers them only where the product has a group that is on the menu', () => {
    renderPage()
    expect(addOnsOf('Spanish Latte')).not.toBeNull()
    expect(addOnsOf('Americano')).toBeNull()
    expect(addOnsOf('Cold Brew')).toBeNull()
  })

  it('offers nothing for a group that is not on the menu', () => {
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Orphan', groupIds: ['gone'] })]) })
    expect(addOnsOf('Orphan')).toBeNull()
  })

  it('opens and closes under the row, saying so with aria-expanded, and prints no sizes twice', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = addOnsOf('Spanish Latte') as HTMLElement
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toHaveAttribute('data-open')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveAttribute('data-open')
    expect(within(panel).getByText('Milk')).toBeInTheDocument()
    expect(within(panel).queryByText(text.template.sizes)).toBeNull()
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toHaveAttribute('data-open')
  })

  it('reads a name that holds "$&" as it is', () => {
    renderPage({ menu: { ...menuWith([plainProduct('p-a', 'cat-hot', { name: 'Tea $& Co', groupIds: ['grp-milk'] })]) } })
    expect(addOnsOf('Tea $& Co')).not.toBeNull()
  })
})

describe('the Marmalade page: in the Design preview', () => {
  it('holds no link, no button, no field and no tab stop, and no navigation landmark', () => {
    const { container } = renderPage({ interactive: false })
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getAllByText('Add-ons').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hot').length).toBeGreaterThan(0)
  })

  it('keeps the Visit section whole but with no links and no landmark, under the same id for the frame to scroll to', () => {
    const { container } = renderPage({ interactive: false, business: sampleBusiness({ social: WITH_SOCIAL }) })
    expect(screen.getByRole('heading', { name: text.template.visit.heading })).toBeInTheDocument()
    expect(screen.getByText(sampleBusiness().phone)).toBeInTheDocument()
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('section[aria-labelledby]')).toBeNull()
    expect(container.querySelector('#marmalade-section-2')).not.toBeNull()
  })

  it('still scrolls its frame to Visit from the top words', async () => {
    const scrollTo = vi.fn()
    const user = userEvent.setup()
    const { container } = renderPage({ interactive: false })
    const frame = container.firstElementChild as HTMLElement
    frame.style.overflowY = 'auto'
    frame.scrollTo = scrollTo
    await user.click(screen.getAllByText(text.template.siteNav.visit)[0] as HTMLElement)
    expect(scrollTo).toHaveBeenCalledOnce()
  })

  it('animates nothing and holds nothing back, whatever the person prefers', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const { container } = renderPage({ interactive: false, menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'With', image: '/sample/cup-1.jpg' })]) })
    expect(container.querySelector(`.${motion.opening}, .${motion.press}`)).toBeNull()
    expect(container.querySelector('[data-reveal], [data-waiting], [data-moved]')).toBeNull()
    vi.unstubAllGlobals()
  })
})

describe('the Marmalade page: motion', () => {
  it('composes the sign once on the public page', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 }).className).toContain(motion.opening)
    expect(screen.getByText('Coffee and pastries on the corner').className).toContain(motion.afterTwo)
  })

  it('leaves everything visible where there is no observer', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = renderPage()
    expect(container.querySelector("[data-reveal='waiting']")).toBeNull()
    vi.unstubAllGlobals()
  })

  it('holds a picture only until it has arrived, or failed to', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Slow', image: '/sample/cup-1.jpg' }), plainProduct('p-b', 'cat-hot', { name: 'Broken', image: '/sample/cup-2.jpg' })]) })
    const slow = rowOf('Slow').querySelector('img') as HTMLImageElement
    const broken = rowOf('Broken').querySelector('img') as HTMLImageElement
    expect(slow).toHaveAttribute('data-waiting')
    fireEvent.load(slow)
    expect(slow).not.toHaveAttribute('data-waiting')
    fireEvent.error(broken)
    expect(broken).not.toHaveAttribute('data-waiting')
  })

  it('never holds a picture that is already here', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Cached', image: '/sample/cup-1.jpg' })]) })
    expect(rowOf('Cached').querySelector('img')).not.toHaveAttribute('data-waiting')
  })

  it('still scrolls its frame when a tab is tapped, and leaves the page around it alone', async () => {
    const scrollTo = vi.fn()
    const user = userEvent.setup()
    const { container } = renderPage({ interactive: false })
    const frame = container.firstElementChild as HTMLElement
    frame.style.overflowY = 'auto'
    frame.scrollTo = scrollTo
    await user.click(screen.getAllByText('Iced')[0] as HTMLElement)
    expect(scrollTo).toHaveBeenCalledOnce()
  })
})
