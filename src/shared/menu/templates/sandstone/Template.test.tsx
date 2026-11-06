import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { copy } from '@/config/copy'
import type { Business } from '@/entities/business/business'
import type { Menu, Product } from '@/entities/menu/menu'
import { fill } from '@/shared/lib/fill'
import { sampleBusiness, sampleMenu } from '@/test/ownerFixtures'
import { spotlightOf, visibleSections } from '../../sections'
import { directionsHref, motion } from '../kit'
import type { TemplateProps } from '../types'
import { plateFirst, plateOf } from './carte'
import { Template } from './Template'
import { words } from './words'

const text = copy.menu.view
const picture = (name: string) => `https://images.example.com/${name}.jpg`
const site = text.template.siteNav
const NOTHING = { facebook: '', instagram: '', tiktok: '', website: '' }

type Options = Partial<Omit<TemplateProps, 'business'>> & { menu?: Menu; business?: Partial<Business> }

/** The page, drawn the way MenuView hands it its parts: the sample menu (Hot: Americano, Spanish Latte; Iced: Iced Caramel Macchiato, Cold Brew) unless told otherwise. */
function renderPage({ menu = sampleMenu(), business, ...patch }: Options = {}) {
  const sections = visibleSections(menu)
  const props: TemplateProps = {
    business: sampleBusiness(business),
    sections,
    spotlight: spotlightOf(sections),
    groups: menu.groups,
    layout: 'list',
    tags: { name: 'h1', category: 'h2', product: 'h3' },
    interactive: true,
    idOf: (index) => `sec-${index}`,
    photoOf: (item) => item.image,
    placeholderOf: () => 'cup',
    ...patch,
  }
  return { user: userEvent.setup(), ...render(<Template {...props} />) }
}

const product = (patch: Partial<Product>): Product => ({
  id: 'prd-x',
  categoryId: 'cat-hot',
  name: 'Plain',
  description: '',
  price: 12000,
  variants: [],
  tags: [],
  available: true,
  image: null,
  groupIds: [],
  ...patch,
})

/** A menu of the given categories, each with the given products. */
const menuOf = (categories: Record<string, Product[]>): Menu => ({
  categories: Object.keys(categories).map((name) => ({ id: `cat-${name}`, name, visible: true })),
  products: Object.entries(categories).flatMap(([name, list]) => list.map((item) => ({ ...item, categoryId: `cat-${name}` }))),
  groups: [],
})

const headings = (level: number) => screen.getAllByRole('heading', { level }).map((heading) => heading.textContent)
const rowOf = (name: string) => screen.getByRole('heading', { name }).closest('li') as HTMLElement

// A React warning (a key, a bad nesting, an update outside act) fails the test that caused it.
let errors: MockInstance
beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => {
  expect(errors).not.toHaveBeenCalled()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

describe('Sandstone: the card', () => {
  it('steps its headings down from the tags it is given, and lists the products', () => {
    const { container } = renderPage({ tags: { name: 'h2', category: 'h3', product: 'h4' } })
    expect(headings(2)).toEqual([sampleBusiness().name])
    expect(headings(3)).toEqual(['Hot', 'Iced', text.template.visit.heading])
    expect(headings(4)).toEqual(['Americano', 'Spanish Latte', 'Iced Caramel Macchiato', 'Cold Brew'])
    const hot = screen.getByRole('region', { name: 'Hot' })
    expect(hot).toHaveAttribute('id', 'sec-0')
    expect(hot.querySelectorAll(':scope > ul > li')).toHaveLength(2)
    expect(container.querySelectorAll('ul > li h4')).toHaveLength(4)
  })

  it.each(['grid', 'list'] as const)('marks the %s layout on its root and keeps every item', (layout) => {
    const { container } = renderPage({ layout })
    expect(container.querySelector(`[data-layout="${layout}"]`)).not.toBeNull()
    expect(headings(3)).toHaveLength(4)
  })

  it('takes every word as text, never as markup', () => {
    const { container } = renderPage({ business: { name: '<b>Kape</b>', tagline: '<i>Slow</i>' } })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('<b>Kape</b>')
    expect(screen.getByText('<i>Slow</i>')).toBeInTheDocument()
    expect(container.querySelector('b, i')).toBeNull()
  })

  it('sets a name with no logo as type: no picture and no letter in a circle', () => {
    const { container } = renderPage({ business: { logo: null } })
    expect(container.querySelector('h1')?.textContent).toBe(sampleBusiness().name)
    expect(container.querySelector('[data-monogram], [class*="avatar"]')).toBeNull()
  })

  it('shows the logo when there is one', () => {
    const logo = 'https://images.example.com/logo.png'
    const { container } = renderPage({ business: { logo } })
    expect(container.querySelector(`img[src="${logo}"]`)).not.toBeNull()
  })

  it('leaves out an empty tagline', () => {
    renderPage({ business: { tagline: '  ' } })
    expect(screen.queryByText(sampleBusiness().tagline)).toBeNull()
  })

  it('has nothing of a shop: no search, no stats, no call button', () => {
    const { container } = renderPage({ business: { phone: '0917 555 0142' } })
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByText('4 items')).toBeNull()
    expect(container.querySelectorAll('a[href^="tel:"]')).toHaveLength(1)
    expect(container.querySelector('a[href^="tel:"]')?.closest('section')).toBe(screen.getByRole('region', { name: text.template.visit.heading }))
  })
})

describe('Sandstone: the Visit leaf', () => {
  const visit = () => screen.getByRole('region', { name: text.template.visit.heading })

  it('gives the hours, the address, the phone and the social links, each once', () => {
    renderPage()
    const shop = sampleBusiness()
    expect(within(visit()).getByRole('heading', { level: 2 })).toHaveTextContent(text.template.visit.heading)
    expect(within(visit()).getByText(/Mon to Fri, 7 am/)).toBeInTheDocument()
    expect(within(visit()).getByText(shop.address)).toBeInTheDocument()
    expect(screen.getAllByText(/Mon to Fri, 7 am/)).toHaveLength(1)
    expect(document.querySelector('footer')).toBeNull()
  })

  it('links to call, to directions and to the social pages', () => {
    renderPage()
    const shop = sampleBusiness()
    expect(within(visit()).getByRole('link', { name: shop.phone })).toHaveAttribute('href', 'tel:+639175550142')
    const directions = within(visit()).getByRole('link', { name: text.template.visit.directionsLabel })
    expect(directions).toHaveAttribute('href', directionsHref(shop.address))
    expect(directions).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(visit()).getByRole('link', { name: text.social.facebook })).toHaveAttribute('href', shop.social.facebook)
  })

  it('has no line with nothing behind it', () => {
    renderPage({ business: { address: ' ', phone: '' } })
    expect(screen.queryByText(text.footer.address)).toBeNull()
    expect(screen.queryByText(text.footer.phone)).toBeNull()
    expect(screen.queryByRole('link', { name: text.template.visit.directionsLabel })).toBeNull()
    expect(screen.getByText(text.footer.hours)).toBeInTheDocument()
  })

  it('is left out with its link when the shop gave no details', () => {
    renderPage({ business: { address: '', phone: '', hours: '', social: NOTHING } })
    expect(screen.queryByRole('region', { name: text.template.visit.heading })).toBeNull()
    expect(screen.queryByRole('navigation', { name: site.label })).toBeNull()
  })

  it('will not link to a page that is not a clean https address', () => {
    renderPage({ business: { social: { ...NOTHING, facebook: 'javascript:alert(1)' }, phone: '' } })
    expect(screen.queryByRole('link', { name: text.social.facebook })).toBeNull()
  })
})

describe('Sandstone: the running head', () => {
  it('goes to the menu and to the Visit leaf, and hands focus over', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { user } = renderPage()
    const nav = within(screen.getByRole('navigation', { name: site.label }))
    const visit = screen.getByRole('region', { name: text.template.visit.heading })
    expect(nav.getByRole('link', { name: site.visit })).toHaveAttribute('href', `#${visit.id}`)
    await user.click(nav.getByRole('link', { name: site.visit }))
    expect(document.activeElement).toBe(visit)
    await user.click(nav.getByRole('link', { name: site.menu }))
    expect(document.activeElement).toContainElement(screen.getByRole('region', { name: 'Hot' }))
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it('comes before the name, so the page keeps its reading order', () => {
    const { container } = renderPage()
    const nav = screen.getByRole('navigation', { name: site.label })
    expect(nav.compareDocumentPosition(container.querySelector('h1') as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Sandstone: motion', () => {
  it('opens with one entrance on the public page', () => {
    const { container } = renderPage()
    expect(container.querySelector('h1')).toHaveClass(motion.opening as string)
    expect(screen.getByRole('region', { name: 'Hot' })).toHaveClass(motion.opening as string)
    expect(screen.getByRole('region', { name: 'Iced' })).not.toHaveClass(motion.opening as string)
  })

  it('shows everything with no observer to bring it in', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = renderPage()
    expect(container.querySelector('[data-reveal]')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Cold Brew' })).toBeVisible()
    vi.unstubAllGlobals()
  })

  it('holds no picture that has already arrived, and lets go of one that fails', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get')
    complete.mockReturnValue(true)
    const first = renderPage().container.querySelector('img') as HTMLImageElement
    expect(first).not.toHaveAttribute('data-decoding')
    complete.mockReturnValue(false)
    const second = renderPage().container.querySelector('img') as HTMLImageElement
    expect(second).toHaveAttribute('data-decoding')
    second.dispatchEvent(new Event('error'))
    expect(second).not.toHaveAttribute('data-decoding')
  })
})

describe('Sandstone: the plates', () => {
  it('gives a category one plate: the best seller, though an earlier item has a picture', () => {
    const { container } = renderPage({
      menu: menuOf({
        Hot: [product({ id: 'a', name: 'First', image: picture('first') }), product({ id: 'b', name: 'Star', image: picture('star'), tags: ['bestSeller'] })],
      }),
    })
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(rowOf('Star').querySelector('img')).toHaveAttribute('src', picture('star'))
    expect(rowOf('Star').querySelector('img')).toHaveAttribute('alt', '')
    expect(rowOf('First').querySelector('img')).toBeNull()
  })

  it('takes the first picture of a category with no best seller, one for each category', () => {
    const { container } = renderPage({
      menu: menuOf({
        Hot: [product({ id: 'a', name: 'Bare' }), product({ id: 'b', name: 'One', image: picture('one') }), product({ id: 'c', name: 'Two', image: picture('two') })],
        Iced: [product({ id: 'd', name: 'Three', image: picture('three') })],
      }),
    })
    expect([...container.querySelectorAll('img')].map((image) => image.getAttribute('src'))).toEqual([picture('one'), picture('three')])
  })

  it('never shows off a sold-out item', () => {
    const list = [product({ id: 'a', image: picture('a'), tags: ['bestSeller'], available: false }), product({ id: 'b', image: picture('b') })]
    expect(plateOf(list, (item) => item.image)?.id).toBe('b')
    expect(plateOf([list[0] as Product], (item) => item.image)).toBeNull()
  })

  it('draws a category with no picture as pure type, with no placeholder', () => {
    const { container } = renderPage({ menu: menuOf({ Hot: [product({ id: 'a' }), product({ id: 'b', name: 'Other' })] }) })
    expect(container.querySelector('img, [data-placeholder]')).toBeNull()
    expect(container.querySelectorAll('[data-plate]')).toHaveLength(0)
  })

  it('heads the two columns with the plate, and leaves the order of the single column alone', () => {
    const menu = menuOf({ Hot: [product({ id: 'a', name: 'Bare' }), product({ id: 'b', name: 'Pictured', image: picture('b') })] })
    const first = renderPage({ menu, layout: 'list' })
    expect(headings(3)).toEqual(['Bare', 'Pictured'])
    first.unmount()
    const { container } = renderPage({ menu, layout: 'grid' })
    expect(headings(3)).toEqual(['Pictured', 'Bare'])
    expect(container.querySelector('li[data-plate]')).toHaveTextContent('Pictured')
  })

  it('keeps every item when there is no plate to move', () => {
    const list = [product({ id: 'a' }), product({ id: 'b' })]
    expect(plateFirst(list, null)).toEqual(list)
  })
})

describe('Sandstone: an entry', () => {
  it('prints the price beside the name, and every size in place of it', () => {
    renderPage({ menu: menuOf({ Hot: [product({ id: 'a', name: 'One size', price: 12000 }), product({ id: 'b', name: 'Sized', price: 0, variants: [{ id: 'v1', label: 'S', price: 9000 }, { id: 'v2', label: 'L', price: 11000 }] })] }) })
    expect(rowOf('One size')).toHaveTextContent('₱120')
    const sized = rowOf('Sized')
    expect(within(sized).getAllByRole('listitem').map((size) => size.textContent)).toEqual(['S ₱90', 'L ₱110'])
    expect(sized).not.toHaveTextContent('From')
    expect(sized).not.toHaveTextContent('₱0')
  })

  it('prints the whole of a long name and description', () => {
    const name = 'A very long name of a dish that goes on and on and on past any line'
    const description = 'And a description that takes its time. '.repeat(8).trim()
    renderPage({ menu: menuOf({ Hot: [product({ id: 'a', name, description })] }) })
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it.each(['grid', 'list'] as const)('says "Sold out" and the tags in words (%s)', (layout) => {
    const menu = menuOf({
      Hot: [product({ id: 'a', name: 'Gone', available: false, tags: ['new'] }), product({ id: 'b', name: 'Here', tags: ['bestSeller', 'vegetarian'] })],
    })
    renderPage({ menu, layout })
    const sold = screen.getByRole('heading', { name: 'Gone' }).closest('[data-sold-out]')
    expect(sold).toHaveTextContent(text.soldOut)
    expect(sold).toHaveTextContent(text.tags.new)
    const here = rowOf('Here')
    expect(here).toHaveTextContent(text.tags.bestSeller)
    expect(here).toHaveTextContent(text.tags.vegetarian)
    expect(here).not.toHaveTextContent(text.soldOut)
  })
})

describe('Sandstone: the contents line', () => {
  it('links to each category, marks the one read, and goes there on a tap', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { user } = renderPage()
    const nav = within(screen.getByRole('navigation', { name: text.categoriesLabel }))
    const hot = nav.getByRole('link', { name: 'Hot' })
    const iced = nav.getByRole('link', { name: 'Iced' })
    expect(hot).toHaveAttribute('href', '#sec-0')
    expect(hot).toHaveAttribute('aria-current', 'true')
    await user.click(iced)
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(iced).toHaveAttribute('aria-current', 'true')
    expect(hot).not.toHaveAttribute('aria-current')
    expect(document.activeElement).toHaveAttribute('id', 'sec-1')
  })

  it('is not drawn for a single category', () => {
    renderPage({ menu: menuOf({ Hot: [product({ id: 'a' }), product({ id: 'b', name: 'Other' })] }) })
    expect(screen.queryByRole('navigation', { name: text.categoriesLabel })).toBeNull()
  })
})

describe('Sandstone: the add-ons', () => {
  const name = fill(words.addOnsOf, { name: 'Spanish Latte' })

  it.each(['grid', 'list'] as const)('open and close under a text link (%s)', async (layout) => {
    const { user } = renderPage({ layout })
    const control = screen.getByRole('button', { name })
    const panel = document.getElementById(control.getAttribute('aria-controls') ?? '')
    expect(control).toHaveTextContent(words.addOns)
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('inert')
    await user.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'true')
    expect(panel).not.toHaveAttribute('inert')
    expect(panel).toHaveTextContent('Milk')
    await user.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('inert')
  })

  it('leaves the sizes on the row, not in the panel', async () => {
    const { user } = renderPage()
    const control = screen.getByRole('button', { name })
    await user.click(control)
    expect(document.getElementById(control.getAttribute('aria-controls') ?? '')).not.toHaveTextContent(text.template.sizes)
    expect(rowOf('Spanish Latte')).toHaveTextContent('₱205')
  })

  it('has no link for an item with nothing to open', () => {
    renderPage({ menu: menuOf({ Hot: [product({ id: 'a' }), product({ id: 'b', name: 'Other' })] }) })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('skips a group that is not on the menu', () => {
    renderPage({ menu: menuOf({ Hot: [product({ id: 'a', groupIds: ['grp-gone'] })] }) })
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('Sandstone: the Design preview', () => {
  it('has no link, no button, no landmark and no tab stop, and still draws the same page', () => {
    const { container } = renderPage({ interactive: false, business: { phone: '0917 555 0142' } })
    expect(container.querySelector('a, button, input, nav, [role="search"], [tabindex], [aria-live]')).toBeNull()
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Spanish Latte' })).toBeInTheDocument()
    expect(screen.getAllByText('Iced').length).toBeGreaterThan(1)
    expect(screen.getAllByText(words.addOns).length).toBeGreaterThan(0)
  })

  it('still shows the Visit leaf and the running head, as plain words', () => {
    const { container } = renderPage({ interactive: false })
    expect(screen.getByRole('heading', { name: text.template.visit.heading })).toBeInTheDocument()
    expect(screen.getByText(sampleBusiness().address)).toBeInTheDocument()
    expect(screen.getByText(site.menu)).toBeInTheDocument()
    expect(container.querySelector('a')).toBeNull()
  })

  it('stands still: no entrance, nothing held back', () => {
    const { container } = renderPage({ interactive: false })
    for (const name of [motion.opening, motion.press]) expect(container.querySelector(`.${name}`)).toBeNull()
    expect(container.querySelector('[data-reveal], [data-draw], [data-decoding]')).toBeNull()
  })
})
