import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { sampleBusiness } from '@/test/ownerFixtures'
import { directionsHref } from '../kit'
import { menuWith, plainProduct, renderPage } from './Template.testkit'
import { words } from './words'

const text = copy.menu.view
const FOCUSABLE = 'a, button, input, select, textarea, [tabindex]'
const SIZES = /S\s₱165 · M\s₱185 · L\s₱205/

const panelOf = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement
const toggleOf = (name: string) => screen.queryByRole('button', { name: `Add-ons for ${name}` })
const openedBy = (button: HTMLElement) => document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement
const categories = () => within(screen.getByRole('navigation', { name: text.categoriesLabel })).getAllByRole('link')
const siteLinks = () => within(screen.getByRole('navigation', { name: text.template.siteNav.label })).getAllByRole('link')
const noSocial = { facebook: '', instagram: '', tiktok: '', website: '' }
const NOTHING_TO_VISIT = { phone: '', address: '', hours: '', social: noSocial }

const originalScroll = Element.prototype.scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  Element.prototype.scrollIntoView = originalScroll
})

describe('the Lightbox page: structure', () => {
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
    for (const name of ['Americano', 'Spanish Latte', 'Iced Caramel Macchiato', 'Cold Brew']) expect(panelOf(name).parentElement?.tagName).toBe('UL')
    expect(panelOf('Americano').parentElement).toBe(panelOf('Spanish Latte').parentElement)
    expect(panelOf('Americano').parentElement).not.toBe(panelOf('Cold Brew').parentElement)
  })

  it('gives every section its category as its name when it is a page, and no landmark when it is not', () => {
    const page = renderPage()
    expect(screen.getByRole('region', { name: 'Hot' })).toHaveAttribute('id', 'lightbox-section-0')
    expect(screen.getByRole('region', { name: 'Iced' })).toHaveAttribute('id', 'lightbox-section-1')
    page.unmount()
    renderPage({ interactive: false })
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' }).closest('section')).toHaveAttribute('id', 'lightbox-section-0')
  })

  it('keeps the section ids it is given, in menu order', () => {
    renderPage({ idOf: (index) => `menu-x-${index}` })
    expect(document.getElementById('menu-x-1')).toContainElement(screen.getByRole('heading', { level: 2, name: 'Iced' }))
    expect(categories().map((link) => link.getAttribute('href'))).toEqual(['#menu-x-0', '#menu-x-1'])
  })

  it.each(['list', 'grid'] as const)('marks the %s layout on the page and draws the same panels in it', (layout) => {
    const { container } = renderPage({ layout })
    expect(container.firstElementChild).toHaveAttribute('data-layout', layout)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
    expect(within(panelOf('Spanish Latte')).getByText(SIZES)).toBeInTheDocument()
  })

  it.each(['light', 'dark'] as const)('marks the %s mode on the page, which decides what paints the frame and the panels', (mode) => {
    const business = sampleBusiness()
    const { container } = renderPage({ business: { ...business, theme: { ...business.theme, mode } } })
    expect(container.firstElementChild).toHaveAttribute('data-mode', mode)
  })

  it('has no search: the first photo comes straight after the title and the categories', () => {
    renderPage()
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('search')).toBeNull()
  })
})

describe('the Lightbox page: the opening', () => {
  it('holds the name of the shop and its tagline, and nothing else', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' }).parentElement?.textContent).toBe('Kape KantoCoffee and pastries on the corner')
  })

  it('draws no empty line for a shop with no tagline', () => {
    renderPage({ business: sampleBusiness({ tagline: '' }) })
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' }).parentElement?.querySelector('p')).toBeNull()
  })

  it('draws the logo small before the name, as decoration, when there is one', () => {
    const { container } = renderPage({ business: sampleBusiness({ logo: '/sample/cup-1.jpg' }) })
    const logo = container.querySelector('img[src="/sample/cup-1.jpg"]') as HTMLImageElement
    expect(logo).toHaveAttribute('alt', '')
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' }).parentElement?.firstElementChild).toContainElement(logo)
  })

  it('draws no letter and no picture for a shop with no logo, and none for an address the page may not show', () => {
    const page = renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' }).parentElement?.querySelector('img')).toBeNull()
    expect(screen.queryByText('K')).toBeNull()
    page.unmount()
    const { container } = renderPage({ business: sampleBusiness({ logo: 'https://evil.example.com/logo.png' }) })
    expect(container.querySelector('img[src="https://evil.example.com/logo.png"]')).toBeNull()
  })
})

describe('the Lightbox page: the site links', () => {
  it('lead to the menu and to the Visit section, in a navigation landmark of their own', () => {
    renderPage()
    const [menu, visit] = siteLinks()
    expect(menu).toHaveTextContent(text.template.siteNav.menu)
    expect(menu).toHaveAttribute('href', '#lightbox-section-0')
    expect(visit).toHaveTextContent(text.template.siteNav.visit)
    expect(visit).toHaveAttribute('href', '#lightbox-section-0-visit')
    expect(document.getElementById('lightbox-section-0-visit')).toContainElement(screen.getByRole('heading', { level: 2, name: text.template.visit.heading }))
  })

  it('scroll to the Visit section on a tap, and hand focus to it', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(siteLinks()[1] as HTMLElement)
    const visit = document.getElementById('lightbox-section-0-visit')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(visit).toHaveFocus()
  })

  it('are not drawn for a shop with nothing to visit: one place needs no links', () => {
    renderPage({ business: sampleBusiness(NOTHING_TO_VISIT) })
    expect(screen.queryByRole('navigation', { name: text.template.siteNav.label })).toBeNull()
    expect(screen.queryByText(text.template.siteNav.menu)).toBeNull()
  })
})

describe('the Lightbox page: the Visit section', () => {
  it('comes after the whole menu and draws the shared facts, the phone as the one way to call', () => {
    renderPage()
    const visit = screen.getByRole('region', { name: text.template.visit.heading })
    const last = screen.getByRole('region', { name: 'Iced' })
    expect(last.compareDocumentPosition(visit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(visit).getByText('12 Mabini Street, Lahug, Cebu City')).toBeInTheDocument()
    expect(within(visit).getByRole('link', { name: '+63 917 555 0142' })).toHaveAttribute('href', 'tel:+639175550142')
    expect(document.querySelectorAll('a[href^="tel:"]')).toHaveLength(1)
    expect(document.querySelector('footer')).toBeNull()
  })

  it('links to directions for the address, in a new tab that cannot reach back', () => {
    renderPage()
    const link = screen.getByRole('link', { name: text.template.visit.directionsLabel })
    expect(link).toHaveAttribute('href', directionsHref('12 Mabini Street, Lahug, Cebu City'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('links the social pages the shop has', () => {
    renderPage({ business: sampleBusiness({ social: { ...noSocial, instagram: 'https://instagram.com/kapekanto' } }) })
    expect(screen.getByRole('link', { name: text.social.instagram })).toHaveAttribute('href', 'https://instagram.com/kapekanto')
    expect(screen.queryByRole('link', { name: text.social.facebook })).toBeNull()
  })

  it('leaves out each line with nothing behind it', () => {
    renderPage({ business: sampleBusiness({ phone: '', address: '' }) })
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
    expect(screen.queryByRole('link', { name: text.template.visit.directionsLabel })).toBeNull()
    expect(screen.queryByText(text.footer.address)).toBeNull()
    expect(screen.queryByText(text.footer.phone)).toBeNull()
    expect(screen.getByRole('region', { name: text.template.visit.heading })).toBeInTheDocument()
  })

  it('draws nothing at all for a shop with nothing to visit', () => {
    renderPage({ business: sampleBusiness(NOTHING_TO_VISIT) })
    expect(screen.queryByRole('heading', { name: text.template.visit.heading })).toBeNull()
    expect(document.getElementById('lightbox-section-0-visit')).toBeNull()
  })
})

describe('the Lightbox page: motion', () => {
  it('holds nothing back when the browser has no IntersectionObserver: all the words are there', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = renderPage()
    vi.unstubAllGlobals()
    expect(container.querySelector('[data-reveal]')).toBeNull()
    expect(container.querySelector('[data-arriving]')).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: 'Cold Brew' })).toBeVisible()
    expect(screen.getByRole('region', { name: text.template.visit.heading })).toBeVisible()
  })

  it('gives the name and the first section their step of the opening on the public page', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('opening')
    expect(document.getElementById('lightbox-section-0')?.className).toContain('afterTwo')
    expect(document.getElementById('lightbox-section-1')?.className).not.toContain('opening')
  })

  it('stays still in the Design preview: no opening, no press, no hold, and the mark does not glide', () => {
    const { container } = renderPage({ interactive: false })
    expect(container.querySelector('[class*="afterOne"], [class*="afterTwo"], [class*="press"]')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).className).not.toContain('opening')
    expect(container.querySelector('[data-reveal], [data-arriving], [data-glide]')).toBeNull()
  })

  it('tells the category row where its mark stands, in the preview too', () => {
    const { container } = renderPage({ interactive: false })
    const row = container.querySelector('[data-selected]')?.closest('ul')
    expect(row?.style.getPropertyValue('--tpl-mark-width')).not.toBe('')
  })
})

describe('the Lightbox page: a panel', () => {
  it('puts the picture first, as decoration, with the name and the price in the strip right under it', () => {
    renderPage()
    const panel = panelOf('Spanish Latte')
    const picture = panel.querySelector('img') as HTMLImageElement
    expect(picture).toHaveAttribute('src', 'https://images.example.com/spanish-latte.jpg')
    expect(picture).toHaveAttribute('alt', '')
    expect(panel).toHaveAttribute('data-photo')
    expect(panel.firstElementChild).toContainElement(picture)
    expect(panel.children[1]).toContainElement(screen.getByRole('heading', { level: 3, name: 'Spanish Latte' }))
    expect(panel.children[1]).toContainElement(within(panel).getByText('₱165'))
  })

  it('leaves the photo as it is: no size on the picture, and no text inside its box', () => {
    renderPage()
    const picture = panelOf('Spanish Latte').querySelector('img') as HTMLImageElement
    expect(picture).not.toHaveAttribute('width')
    expect(picture).not.toHaveAttribute('height')
    expect(picture.parentElement?.textContent).toBe('')
  })

  it('prints the lowest price on the tag, with no "From", and every size in the strip without opening anything', () => {
    renderPage()
    const latte = panelOf('Spanish Latte')
    expect(latte.textContent).not.toContain(text.from)
    expect(within(latte).getByText(SIZES)).toBeVisible()
    expect(latte.children[1]).toContainElement(within(latte).getByText(SIZES))
    expect(panelOf('Cold Brew').textContent).toContain('₱150')
    expect(panelOf('Cold Brew').textContent).not.toContain('S ₱')
  })

  it('prints the description in full, and nothing for an empty one', () => {
    const long = 'Black tea, hot. '.repeat(40).trim()
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Plain Tea', description: long }), plainProduct('p-b', 'cat-hot', { name: 'Bare Tea' })]) })
    expect(within(panelOf('Plain Tea')).getByText(long)).toBeInTheDocument()
    expect(panelOf('Bare Tea').querySelectorAll('p')).toHaveLength(0)
    expect(panelOf('Bare Tea').children).toHaveLength(1)
  })

  it('prints the tags as words, the best seller with a star beside the word and the others without', () => {
    renderPage()
    expect(within(panelOf('Spanish Latte')).getByText(text.tags.bestSeller).closest('li')?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(within(panelOf('Iced Caramel Macchiato')).getByText(text.tags.new).closest('li')?.querySelector('svg')).toBeNull()
    expect(within(panelOf('Cold Brew')).getByText(text.tags.vegan)).toBeInTheDocument()
    expect(within(panelOf('Americano')).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('says sold out in words and marks only that panel, so its stylesheet can dim the picture', () => {
    renderPage()
    expect(screen.getAllByText(text.soldOut)).toHaveLength(1)
    expect(within(panelOf('Iced Caramel Macchiato')).getByText(text.soldOut)).toBeInTheDocument()
    expect(panelOf('Iced Caramel Macchiato')).toHaveAttribute('data-sold-out')
    expect(panelOf('Cold Brew')).not.toHaveAttribute('data-sold-out')
  })

  it('makes a product with no photo a panel of type: no image, no drawing, no empty box', () => {
    const placeholderOf = vi.fn(() => 'cup' as const)
    renderPage({ placeholderOf })
    const panel = panelOf('Americano')
    expect(panel).not.toHaveAttribute('data-photo')
    expect(panel.querySelector('img, svg, [data-placeholder]')).toBeNull()
    expect(panel.firstElementChild).toContainElement(screen.getByRole('heading', { level: 3, name: 'Americano' }))
    expect(placeholderOf).not.toHaveBeenCalled()
  })

  it('asks for the picture of a product through photoOf, so an address the page may not show is never drawn', () => {
    const photoOf = vi.fn(() => null)
    renderPage({ photoOf })
    expect(photoOf).toHaveBeenCalled()
    expect(document.querySelector('img')).toBeNull()
  })

  it('loads the first four pictures of the page at once, across categories, and leaves the rest until they scroll into view', () => {
    const pictured = (id: string, categoryId: string) => plainProduct(id, categoryId, { image: `https://images.example.com/${id}.jpg` })
    renderPage({ menu: menuWith([...['a', 'b', 'c'].map((id) => pictured(id, 'cat-hot')), ...['d', 'e', 'f'].map((id) => pictured(id, 'cat-iced'))]) })
    expect([...document.querySelectorAll('img')].map((image) => image.getAttribute('loading'))).toEqual(['eager', 'eager', 'eager', 'eager', 'lazy', 'lazy'])
  })

  it.each(['list', 'grid'] as const)('prints a long name and a long unbroken word whole in the %s layout (wrapping is the stylesheet)', (layout) => {
    const name = 'Extra Long Caramel Cookie Crumble Frappuccino With Whipped Cream ' + 'x'.repeat(40)
    renderPage({ layout, menu: menuWith([plainProduct('p-a', 'cat-hot', { name, groupIds: ['grp-milk'] })]) })
    expect(screen.getByRole('heading', { level: 3, name })).toHaveTextContent(name)
    expect(panelOf(name).textContent).toContain('₱100')
    expect(toggleOf(name)).toBeInTheDocument()
  })
})

describe('the Lightbox page: the add-ons', () => {
  it('can be opened only on a product with add-ons, not on one with sizes alone', () => {
    renderPage()
    expect(toggleOf('Spanish Latte')).toBeInTheDocument()
    expect(toggleOf('Iced Caramel Macchiato')).toBeInTheDocument()
    expect(toggleOf('Americano')).toBeNull()
    expect(toggleOf('Cold Brew')).toBeNull()
  })

  it('cannot be opened when the group of a product is not on the menu', () => {
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Lost Tea', groupIds: ['grp-gone'] })]) })
    expect(toggleOf('Lost Tea')).toBeNull()
  })

  it('open under a plain text control and close again, saying so with aria-expanded', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = toggleOf('Spanish Latte') as HTMLElement
    const opened = openedBy(button)
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveTextContent(words.addOns)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(opened).not.toHaveAttribute('data-open')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(opened).toHaveAttribute('data-open')
    expect(opened).toHaveTextContent('Oat milk +₱45 · Soy milk +₱35')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(opened).not.toHaveAttribute('data-open')
  })

  it('do not repeat the sizes, which are already printed in the strip', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = toggleOf('Spanish Latte') as HTMLElement
    await user.click(button)
    expect(within(openedBy(button)).queryByText(text.template.sizes)).toBeNull()
    expect(within(panelOf('Spanish Latte')).getAllByText(SIZES)).toHaveLength(1)
  })

  it('open on one product without touching the others', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(toggleOf('Spanish Latte') as HTMLElement)
    expect(toggleOf('Iced Caramel Macchiato')).toHaveAttribute('aria-expanded', 'false')
  })

  it('are named for their product, with the name printed as it is', () => {
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Spicy $& Co', groupIds: ['grp-milk'] })]) })
    expect(screen.getByRole('button', { name: 'Add-ons for Spicy $& Co' })).toBeInTheDocument()
  })
})

describe('the Lightbox page: the category links', () => {
  it('are links in a navigation landmark, one for each category, in menu order', () => {
    renderPage()
    expect(categories().map((link) => link.textContent)).toEqual(['Hot', 'Iced'])
    expect(categories().map((link) => link.getAttribute('href'))).toEqual(['#lightbox-section-0', '#lightbox-section-1'])
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
    const section = document.getElementById('lightbox-section-1')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(section).toHaveAttribute('tabindex', '-1')
    expect(section).toHaveFocus()
  })
})

describe('the Lightbox page in the Design preview', () => {
  it('draws no link, button, input or tab stop, and no navigation landmark', () => {
    const { container } = renderPage({ interactive: false })
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('draws the Visit section with its facts as plain text, no link and no landmark, and keeps its id for the frame to scroll to', () => {
    renderPage({ interactive: false })
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(screen.getByText('+63 917 555 0142')).toBeInTheDocument()
    expect(document.getElementById('lightbox-section-0-visit')).not.toBeNull()
    expect(screen.getByText(text.template.siteNav.visit, { selector: 'span' })).toBeInTheDocument()
  })

  it('draws the categories as plain text with the same look', () => {
    renderPage({ interactive: false })
    expect(screen.getByText('Iced', { selector: 'span' })).toBeInTheDocument()
    expect(document.querySelector('[data-selected]')?.textContent).toBe('Hot')
    expect(document.querySelector('[aria-current]')).toBeNull()
  })

  it('still prints the words of the add-ons where a product has them, as text with nothing to open', () => {
    renderPage({ interactive: false })
    const panel = panelOf('Spanish Latte')
    expect(within(panel).getByText(words.addOns)).toBeInTheDocument()
    expect(panel.querySelector('[hidden], [aria-expanded]')).toBeNull()
    expect(within(panelOf('Cold Brew')).queryByText(words.addOns)).toBeNull()
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
    expect(document.getElementById('lightbox-section-1')).not.toHaveAttribute('tabindex')
  })
})

describe('the Lightbox page: free text', () => {
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
})
