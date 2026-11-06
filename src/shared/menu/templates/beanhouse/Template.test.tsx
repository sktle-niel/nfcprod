import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { sampleBusiness } from '@/test/ownerFixtures'
import { menuWith, plainProduct, renderPage } from './Template.testkit'

const text = copy.menu.view
const FOCUSABLE = 'a, button, input, select, textarea, [tabindex]'

const rowOf = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement
const moreOf = (name: string) => screen.queryByRole('button', { name: `Add-ons for ${name}` })
const stamp = () => document.querySelector('svg[viewBox="0 0 240 240"]') as SVGElement
const categories = () => screen.getByRole('navigation', { name: text.categoriesLabel })
const siteNav = () => screen.getByRole('navigation', { name: text.template.siteNav.label })
const SOCIAL = { facebook: 'https://facebook.com/kapekanto', instagram: '', tiktok: '', website: '' }
const NO_CONTACT = { phone: '', address: '', hours: '', social: { facebook: '', instagram: '', tiktok: '', website: '' } }

describe('the Beanhouse page: structure', () => {
  it('draws the business name as the page heading, each category and each item as a heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Iced' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Americano' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Cold Brew' })).toBeInTheDocument()
  })

  it('steps every heading down one level when the page sits inside another', () => {
    renderPage({ tags: { name: 'h2', category: 'h3', product: 'h4' } })
    expect(screen.getAllByRole('heading', { level: 2, name: 'Kape Kanto' })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 3, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Americano' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('draws no main or banner landmark, which the page around it has', () => {
    const { container } = renderPage()
    expect(container.querySelector('main')).toBeNull()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('lists the items in a list, each one in a list item', () => {
    renderPage()
    for (const name of ['Americano', 'Spanish Latte', 'Iced Caramel Macchiato', 'Cold Brew']) expect(rowOf(name).parentElement?.tagName).toBe('UL')
  })

  it('shows every category on the page, not only one at a time', () => {
    renderPage()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
  })

  it('gives every section its category as its name when it is a page, and no landmark when it is not', () => {
    const page = renderPage()
    expect(screen.getByRole('region', { name: 'Hot' })).toHaveAttribute('id', 'beanhouse-section-0')
    expect(screen.getByRole('region', { name: 'Iced' })).toHaveAttribute('id', 'beanhouse-section-1')
    page.unmount()
    renderPage({ interactive: false })
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' }).closest('section')).toHaveAttribute('id', 'beanhouse-section-0')
  })

  it.each(['list', 'grid'] as const)('marks the %s layout on the page and on each row, so the stylesheets can switch on it', (layout) => {
    const { container } = renderPage({ layout })
    expect(container.firstElementChild).toHaveAttribute('data-layout', layout)
    for (const name of ['Americano', 'Cold Brew']) expect(rowOf(name)).toHaveAttribute('data-layout', layout)
  })

  it('marks the mode on the page', () => {
    const { container } = renderPage()
    expect(container.firstElementChild).toHaveAttribute('data-mode', sampleBusiness().theme.mode)
  })

})

describe('the Beanhouse page: the stamp', () => {
  it('sets the real name on the ring, hidden from readers, who get it once as text, and prints the tagline under it', () => {
    renderPage()
    expect(stamp()).toHaveAttribute('aria-hidden', 'true')
    const lines = [...stamp().querySelectorAll('textPath')].map((line) => line.textContent)
    expect(lines).toEqual(['KAPE KANTO'])
    expect(screen.getAllByRole('heading', { name: 'Kape Kanto' })).toHaveLength(1)
    expect(screen.getByText('Coffee and pastries on the corner').tagName).toBe('P')
  })

  it('ties each line to an arc of its own, with an id that is safe in a reference', () => {
    renderPage()
    for (const line of stamp().querySelectorAll('textPath')) {
      const href = line.getAttribute('href') ?? ''
      expect(href).toMatch(/^#[a-zA-Z0-9-]+$/)
      expect(line.ownerDocument.getElementById(href.slice(1))?.tagName).toBe('path')
      expect(Number(line.getAttribute('textLength'))).toBeGreaterThan(0)
    }
  })

  it('gives two stamps on one screen different arcs (the Design gallery draws many)', () => {
    renderPage()
    renderPage()
    const refs = [...document.querySelectorAll('textPath')].map((line) => line.getAttribute('href'))
    expect(new Set(refs).size).toBe(refs.length)
  })

  it('draws clean lines: no ink filter roughens the seal', () => {
    renderPage()
    expect(document.querySelector('filter, [filter]')).toBeNull()
  })

  it('closes the ring with dots for a business with no tagline, and draws no empty paragraph', () => {
    const { container } = renderPage({ business: sampleBusiness({ tagline: '' }) })
    expect(stamp().querySelectorAll('textPath')).toHaveLength(1)
    expect(container.querySelector('p:empty')).toBeNull()
  })

  it('still names a business whose name is too long for the ring, in plain type', () => {
    const name = 'x'.repeat(70)
    renderPage({ business: sampleBusiness({ name }) })
    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument()
    expect([...stamp().querySelectorAll('textPath')].map((line) => line.textContent)).not.toContain(name.toUpperCase())
  })

  it('puts a neutral mark in the middle, or the logo in its place, and draws no letter for a missing logo', () => {
    const page = renderPage()
    expect(stamp().querySelector('polygon')).not.toBeNull()
    expect(screen.queryByText('K')).toBeNull()
    page.unmount()
    const { container } = renderPage({ business: sampleBusiness({ logo: '/sample/cup-1.jpg' }) })
    expect(stamp().querySelector('polygon')).toBeNull()
    expect(container.querySelector('img[src="/sample/cup-1.jpg"]')).toHaveAttribute('alt', '')
  })

  it('draws the logo only when it is an address the page may show', () => {
    const { container } = renderPage({ business: sampleBusiness({ logo: 'https://evil.example.com/logo.png' }) })
    expect(container.querySelector('img[src="https://evil.example.com/logo.png"]')).toBeNull()
    expect(stamp().querySelector('polygon')).not.toBeNull()
  })
})

describe('the Beanhouse page: the products', () => {
  it('shows the lowest price on the row and prints the sizes under it', () => {
    renderPage()
    expect(rowOf('Spanish Latte').textContent).toContain('₱165')
    expect(rowOf('Spanish Latte').textContent).toMatch(/S\s₱165 · M\s₱185 · L\s₱205/)
    expect(rowOf('Cold Brew').textContent).toContain('₱150')
  })

  it('shows the description, and nothing for an empty one', () => {
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Plain Tea', description: 'Black tea, hot.' }), plainProduct('p-b', 'cat-hot', { name: 'Bare Tea' })]) })
    expect(within(rowOf('Plain Tea')).getByText('Black tea, hot.')).toBeInTheDocument()
    expect(rowOf('Bare Tea').querySelector('p')).toBeNull()
  })

  it('shows the tags as words', () => {
    renderPage()
    expect(within(rowOf('Spanish Latte')).getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(within(rowOf('Iced Caramel Macchiato')).getByText(text.tags.new)).toBeInTheDocument()
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

  it('draws the picture as decoration, and a row with no picture as words alone', () => {
    renderPage()
    const picture = rowOf('Spanish Latte').querySelector('img')
    expect(picture).toHaveAttribute('src', 'https://images.example.com/spanish-latte.jpg')
    expect(picture).toHaveAttribute('alt', '')
    expect(rowOf('Spanish Latte')).toHaveAttribute('data-photo')
    expect(rowOf('Americano').querySelector('img')).toBeNull()
    expect(rowOf('Americano').querySelector('[data-placeholder]')).toBeNull()
    expect(rowOf('Americano')).not.toHaveAttribute('data-photo')
  })

  it('asks for the picture of a product through photoOf, so an address the page may not show is never drawn', () => {
    const photoOf = vi.fn(() => null)
    renderPage({ photoOf })
    expect(photoOf).toHaveBeenCalled()
    expect(document.querySelector('img')).toBeNull()
  })

  it('prints a long name and a long description whole', () => {
    const name = 'Extra Long Caramel Cookie Crumble Frappuccino With Whipped Cream ' + 'x'.repeat(40)
    const description = 'A very long description '.repeat(10).trim()
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name, description })]) })
    expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })
})

describe('the Beanhouse page: the add-ons of a product', () => {
  it('have a control only on a product with add-ons, and sizes alone do not need one', () => {
    renderPage()
    expect(moreOf('Spanish Latte')).toBeInTheDocument()
    expect(moreOf('Americano')).toBeNull()
    expect(moreOf('Cold Brew')).toBeNull()
  })

  it('open under the row and close again, saying so with aria-expanded', async () => {
    const user = userEvent.setup()
    renderPage()
    const button = moreOf('Spanish Latte') as HTMLElement
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toHaveAttribute('data-open')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveAttribute('data-open')
    expect(within(panel).getByText('Milk')).toBeInTheDocument()
    expect(panel).toHaveTextContent('Oat milk +₱45 · Soy milk +₱35')
    expect(within(panel).queryByText('Sizes')).toBeNull()
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toHaveAttribute('data-open')
  })

  it('start closed: no item is open when the page opens', () => {
    renderPage()
    for (const button of screen.getAllByRole('button', { expanded: false })) expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { expanded: true })).toBeNull()
  })

  it('skip a group that is not on the menu', () => {
    renderPage({ menu: menuWith([plainProduct('p-a', 'cat-hot', { name: 'Lost Tea', groupIds: ['no-such-group'] })]) })
    expect(moreOf('Lost Tea')).toBeNull()
  })

  it('name their control after the product, printed as it is', () => {
    const groupIds = ['grp-milk']
    const product = plainProduct('p-a', 'cat-hot', { name: 'Spicy $& Co', groupIds })
    renderPage({ menu: menuWith([product]) })
    expect(screen.getByRole('button', { name: 'Add-ons for Spicy $& Co' })).toBeInTheDocument()
  })
})

describe('the Beanhouse page: the category labels', () => {
  const originalScroll = Element.prototype.scrollIntoView
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => {
    Element.prototype.scrollIntoView = originalScroll
  })

  it('are links in a navigation landmark, one for each category, in menu order', () => {
    renderPage()
    const links = within(categories()).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Hot', 'Iced'])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#beanhouse-section-0', '#beanhouse-section-1'])
  })

  it('mark the first category as the one being read', () => {
    renderPage()
    const [hot, iced] = within(categories()).getAllByRole('link')
    expect(hot).toHaveAttribute('aria-current', 'true')
    expect(hot).toHaveAttribute('data-selected')
    expect(iced).not.toHaveAttribute('aria-current')
  })

  it('scroll to their section on a tap, and hand focus to it', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(within(categories()).getByRole('link', { name: 'Iced' }))
    const section = document.getElementById('beanhouse-section-1')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(section).toHaveAttribute('tabindex', '-1')
    expect(section).toHaveFocus()
  })

  it('keep the section ids they are given', () => {
    renderPage({ idOf: (index) => `menu-x-${index}` })
    expect(document.getElementById('menu-x-1')).toContainElement(screen.getByRole('heading', { level: 2, name: 'Iced' }))
    expect(within(categories()).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#menu-x-0', '#menu-x-1'])
  })
})

describe('the Beanhouse page: the links in the fold', () => {
  const originalScroll = Element.prototype.scrollIntoView
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })
  afterEach(() => {
    Element.prototype.scrollIntoView = originalScroll
  })

  it('go to the menu and to the Visit section, in a navigation of their own', () => {
    renderPage()
    const links = within(siteNav()).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([text.template.siteNav.menu, text.template.siteNav.visit])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#beanhouse-section-0-menu', '#beanhouse-section-0-visit'])
    expect(document.getElementById('beanhouse-section-0-menu')).toContainElement(screen.getByRole('heading', { level: 2, name: 'Hot' }))
    expect(screen.getByRole('region', { name: text.template.visit.heading })).toHaveAttribute('id', 'beanhouse-section-0-visit')
  })

  it('scroll on a tap and hand focus to where they land', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(within(siteNav()).getByRole('link', { name: text.template.siteNav.visit }))
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(screen.getByRole('region', { name: text.template.visit.heading })).toHaveFocus()
  })

  it('are not drawn for a shop with nothing to visit by: a lone Menu link would do nothing', () => {
    const { container } = renderPage({ business: sampleBusiness(NO_CONTACT) })
    expect(screen.queryByRole('navigation', { name: text.template.siteNav.label })).toBeNull()
    expect(container.firstElementChild?.firstElementChild).toBeEmptyDOMElement()
  })
})

describe('the Beanhouse page: the Visit section', () => {
  it('has the hours, a tap to call, directions and the social links, and no call button anywhere else', () => {
    renderPage({ business: sampleBusiness({ social: SOCIAL }) })
    const visit = within(screen.getByRole('region', { name: text.template.visit.heading }))
    expect(screen.getByRole('heading', { level: 2, name: text.template.visit.heading })).toBeInTheDocument()
    expect(visit.getByText('12 Mabini Street, Lahug, Cebu City')).toBeInTheDocument()
    expect(visit.getByText(text.footer.hours)).toBeInTheDocument()
    expect(visit.getByRole('link', { name: '+63 917 555 0142' })).toHaveAttribute('href', 'tel:+639175550142')
    const directions = visit.getByRole('link', { name: text.template.visit.directionsLabel })
    expect(directions.getAttribute('href')).toContain('https://www.google.com/maps/search/')
    expect(directions).toHaveAttribute('rel', 'noopener noreferrer')
    expect(visit.getByRole('link', { name: text.social.facebook })).toHaveAttribute('href', 'https://facebook.com/kapekanto')
    expect(screen.queryByRole('link', { name: /^Call / })).toBeNull()
  })

  it('leaves out what the shop did not give, with no empty line and no dead link', () => {
    renderPage({ business: sampleBusiness({ ...NO_CONTACT, hours: 'Daily, 7 am to 9 pm' }) })
    const visit = within(screen.getByRole('region', { name: text.template.visit.heading }))
    expect(visit.getByText('Daily, 7 am to 9 pm')).toBeInTheDocument()
    expect(visit.queryByRole('link')).toBeNull()
    expect(visit.queryByText(text.footer.phone)).toBeNull()
    expect(visit.queryByText(text.footer.address)).toBeNull()
  })

  it('is not drawn at all for a shop with no contact lines', () => {
    renderPage({ business: sampleBusiness(NO_CONTACT) })
    expect(screen.queryByRole('heading', { name: text.template.visit.heading })).toBeNull()
    expect(document.querySelector('footer')).toBeNull()
  })
})

describe('the Beanhouse page: motion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** A phone that wants motion, with every section laid out below the fold and an observer that never answers. */
  const belowTheFold = () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }))
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
    return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000, height: 100 } as DOMRect)
  }

  it('leaves everything showing with no observer to wait for', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = renderPage()
    expect(container.querySelector('[data-reveal]')).toBeNull()
  })

  it('holds the sections and the Visit section below the fold for their entrance, on the public page', () => {
    const measured = belowTheFold()
    renderPage()
    expect(document.getElementById('beanhouse-section-1')).toHaveAttribute('data-reveal', 'waiting')
    expect(document.getElementById('beanhouse-section-0-visit')).toHaveAttribute('data-reveal', 'waiting')
    measured.mockRestore()
  })

  it('never holds a section in the Design preview, and plays no opening there', () => {
    const measured = belowTheFold()
    const { container } = renderPage({ interactive: false })
    expect(container.querySelector('[data-reveal]')).toBeNull()
    expect(container.querySelector('[class*="opening"]')).toBeNull()
    measured.mockRestore()
  })

  it('plays its one opening on the public page', () => {
    const { container } = renderPage()
    expect(container.querySelector('[class*="opening"]')).not.toBeNull()
  })

  it('fades in a picture on its way, on the public page only', () => {
    const page = renderPage()
    expect(rowOf('Spanish Latte').querySelector('img')).toHaveAttribute('data-arriving')
    page.unmount()
    renderPage({ interactive: false })
    expect(rowOf('Spanish Latte').querySelector('img')).not.toHaveAttribute('data-arriving')
  })
})

describe('the Beanhouse page in the Design preview', () => {
  it('draws no link, button, input or tab stop, and no navigation landmark', () => {
    const { container } = renderPage({ interactive: false, business: sampleBusiness({ social: SOCIAL }) })
    expect(container.querySelectorAll(FOCUSABLE)).toHaveLength(0)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('still shows the Visit section and the words of the fold, as plain text and no landmark', () => {
    renderPage({ interactive: false })
    expect(screen.queryAllByRole('region')).toHaveLength(0)
    expect(screen.getByText(text.template.siteNav.menu)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: text.template.visit.heading }).parentElement).toHaveAttribute('id', 'beanhouse-section-0-visit')
    expect(screen.getByText('+63 917 555 0142').tagName).toBe('P')
  })

  it('draws the labels as plain text with the same look', () => {
    renderPage({ interactive: false })
    expect(screen.getAllByText('Hot').length).toBeGreaterThanOrEqual(2)
    expect(document.querySelector('[data-selected]')?.textContent).toBe('Hot')
  })

  it('still draws the add-ons words where a product has them, without making them a control', () => {
    renderPage({ interactive: false })
    const row = rowOf('Spanish Latte')
    expect(within(row).getByText('Add-ons')).toBeInTheDocument()
    expect(row.querySelector('button')).toBeNull()
    expect(row.querySelector('[hidden]')).toBeNull()
  })
})

describe('the Beanhouse page: free text', () => {
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
  })
})
