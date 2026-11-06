import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { fill } from '@/shared/lib/fill'
import { sampleMenu } from '@/test/ownerFixtures'
import { pinnedPhotos } from './photos'
import { Template } from './Template'
import { business, menuWith, propsFor, renderTemplate } from './Template.testkit'
import { words } from './words'

const text = copy.menu.view
const nav = text.template.siteNav
const previewTags = { name: 'h2', category: 'h3', product: 'h4' } as const
const noContact = { phone: '', address: '', hours: '', social: { facebook: '', instagram: '', tiktok: '', website: '' } }
const rowOf = (name: string) => screen.getByRole('heading', { name }).closest('li') as HTMLElement

describe('Night Glass: the board', () => {
  it('says the name once, as the heading its level asks for, and draws no main of its own (the frame has it)', () => {
    const { container } = renderTemplate()
    expect(screen.getAllByRole('heading', { name: 'Kape Kanto' })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(container.querySelector('main')).toBeNull()
  })

  it('steps every heading down a level on a preview inside another page', () => {
    renderTemplate(sampleMenu(), { tags: previewTags })
    expect(screen.getByRole('heading', { level: 2, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Spanish Latte' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('gives each category a section with the id its link points to, named by its title, with its products in a list', () => {
    renderTemplate()
    const hot = screen.getByRole('region', { name: 'Hot' })
    expect(hot).toHaveAttribute('id', 'ng-section-0')
    expect(screen.getByRole('region', { name: 'Iced' })).toHaveAttribute('id', 'ng-section-1')
    expect(rowOf('Americano').parentElement?.tagName).toBe('UL')
    expect(within(hot).getByRole('list').children).toHaveLength(2)
  })

  it('prints every size of a product with its price, and a single price for one without sizes', () => {
    renderTemplate()
    const latte = within(rowOf('Spanish Latte'))
    expect(latte.getAllByRole('term').map((size) => size.textContent)).toEqual(['S', 'M', 'L'])
    expect(latte.getAllByRole('definition').map((price) => price.textContent)).toEqual(['₱165', '₱185', '₱205'])
    expect(rowOf('Cold Brew')).toHaveTextContent('₱150')
    expect(within(rowOf('Cold Brew')).queryByRole('term')).toBeNull()
  })

  it('says "Sold out" in words and marks the row, so its stylesheet can gray the picture', () => {
    renderTemplate()
    expect(screen.getByText(text.soldOut).closest('li')).toBe(rowOf('Iced Caramel Macchiato'))
    expect(rowOf('Iced Caramel Macchiato')).toHaveAttribute('data-sold-out')
    expect(rowOf('Cold Brew')).not.toHaveAttribute('data-sold-out')
  })

  it('says all the tags of a product as words', () => {
    renderTemplate(menuWith({ 'prd-cold-brew': { tags: ['vegan', 'glutenFree'] } }))
    expect(rowOf('Cold Brew')).toHaveTextContent(text.tags.vegan)
    expect(rowOf('Cold Brew')).toHaveTextContent(text.tags.glutenFree)
    expect(rowOf('Spanish Latte')).toHaveTextContent(text.tags.bestSeller)
  })

  it('puts no picture in a row: most of the board is type', () => {
    renderTemplate()
    expect(rowOf('Spanish Latte').querySelector('img')).toBeNull()
    expect(rowOf('Americano').querySelector('img')).toBeNull()
  })

  it('draws no search, no plus and no button to see the menu: the board is simply read', () => {
    renderTemplate()
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByText('See the menu')).toBeNull()
    expect(screen.getAllByRole('button').every((button) => button.textContent === words.addOns)).toBe(true)
  })

  it('draws no markup from free text', () => {
    const hostile = '<img src=x onerror=alert(1)>'
    const { container } = renderTemplate(menuWith({ 'prd-latte': { name: hostile, description: '<b>bold</b>' } }), {}, business({ name: '<script>alert(1)</script>', tagline: '<i>tag</i>', address: '<u>here</u>' }))
    expect(container.querySelector('script, i, u, b, img[src="x"]')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('<script>alert(1)</script>')
    expect(screen.getByRole('heading', { name: hostile })).toBeInTheDocument()
    expect(screen.getByText('<b>bold</b>')).toBeInTheDocument()
  })
})

describe('Night Glass: the sign', () => {
  it('letters the name with the tagline under it, on no photo', () => {
    renderTemplate()
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' }).nextElementSibling).toHaveTextContent('Coffee and pastries on the corner')
    expect(document.querySelector('[fetchpriority]')).toBeNull()
  })

  it('draws the logo above the name when there is one, and still sets the name as type', () => {
    const { container } = renderTemplate(sampleMenu(), {}, business({ logo: 'https://images.example.com/logo.png' }))
    expect(container.querySelector('img[src="https://images.example.com/logo.png"]')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Kape Kanto$/)
  })

  it('leaves out a tagline the shop does not have', () => {
    const { container } = renderTemplate(sampleMenu(), {}, business({ tagline: '' }))
    expect(container.querySelector('h1')?.nextElementSibling).toBeNull()
  })
})

describe('Night Glass: the price columns', () => {
  const sized = (...labels: string[]) => labels.map((label, index) => ({ id: label, label, price: 10000 + index * 2000 }))
  const heads = (name: string) => screen.getByRole('region', { name }).querySelector('div[class*="heads"]')

  it('puts the real size names over the columns, hidden from a screen reader that hears them in each price', () => {
    renderTemplate()
    expect([...(heads('Hot')?.children ?? [])].map((head) => head.textContent)).toEqual(['S', 'M', 'L'])
    expect(within(rowOf('Spanish Latte')).getByText('M').tagName).toBe('DT')
  })

  it('has no heads for a category of plain prices', () => {
    renderTemplate(menuWith({ 'prd-macchiato': { variants: [] } }))
    expect(heads('Iced')).toBeNull()
  })

  it('stands each price in the column of its size, so a product with fewer sizes keeps the columns', () => {
    renderTemplate(menuWith({ 'prd-americano': { variants: sized('M', 'L') } }))
    const cells = [...within(rowOf('Americano')).getAllByRole('term')].map((term) => term.parentElement?.style.gridColumnStart)
    expect(cells).toEqual(['3', '4'])
    const full = [...within(rowOf('Spanish Latte')).getAllByRole('term')].map((term) => term.parentElement?.style.gridColumnStart)
    expect(full).toEqual(['2', '3', '4'])
  })

  it('stacks the sizes down one column, each with its name, when they cannot go across', () => {
    renderTemplate(menuWith({ 'prd-latte': { variants: sized('8 oz', '12 oz', '16 oz', '22 oz') } }))
    expect(heads('Hot')).toBeNull()
    expect(screen.getByRole('region', { name: 'Hot' })).toHaveAttribute('data-stacked')
    expect(within(rowOf('Spanish Latte')).getAllByRole('term').map((size) => size.textContent)).toEqual(['8 oz', '12 oz', '16 oz', '22 oz'])
    expect(within(rowOf('Spanish Latte')).getAllByRole('definition')).toHaveLength(4)
  })
})

describe('Night Glass: the pinned pictures', () => {
  const photoOf = (product: { image: string | null }) => product.image
  const { sections } = propsFor(menuWith({ 'prd-macchiato': { image: 'sold.jpg' }, 'prd-cold-brew': { image: 'can.jpg' } }))

  it('pins one small picture to a category, as decoration, and none to a category without one', () => {
    const { container } = renderTemplate()
    const pins = container.querySelectorAll('img')
    expect(pins).toHaveLength(1)
    expect(pins[0]).toHaveAttribute('src', 'https://images.example.com/spanish-latte.jpg')
    expect(pins[0]).toHaveAttribute('alt', '')
    expect(screen.getByRole('heading', { name: 'Hot' }).parentElement).toContainElement(pins[0] as HTMLElement)
    expect(screen.getByRole('region', { name: 'Iced' }).querySelector('img')).toBeNull()
  })

  it('never pins more than one to a category, however many pictures it has', () => {
    const { container } = renderTemplate(menuWith({ 'prd-americano': { image: 'https://images.example.com/two.jpg' } }))
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('takes an item that can be had before a sold-out one', () => {
    expect(pinnedPhotos(sections, photoOf)).toEqual(['https://images.example.com/spanish-latte.jpg', 'can.jpg'])
  })

  it('takes a sold-out picture when it is the only one', () => {
    const only = propsFor(menuWith({ 'prd-macchiato': { image: 'sold.jpg' } })).sections
    expect(pinnedPhotos(only, photoOf)).toEqual(['https://images.example.com/spanish-latte.jpg', 'sold.jpg'])
  })

  it('does not pin a picture a category above already showed', () => {
    const same = propsFor(menuWith({ 'prd-macchiato': { image: 'https://images.example.com/spanish-latte.jpg' } })).sections
    expect(pinnedPhotos(same, photoOf)).toEqual(['https://images.example.com/spanish-latte.jpg', null])
  })
})

describe('Night Glass: the category names', () => {
  const nav = () => screen.getByRole('navigation', { name: text.categoriesLabel })

  it('are links to their sections, the first marked as the one being read', () => {
    renderTemplate()
    const hot = within(nav()).getByRole('link', { name: 'Hot' })
    expect(hot).toHaveAttribute('href', '#ng-section-0')
    expect(hot).toHaveAttribute('aria-current', 'true')
    expect(within(nav()).getByRole('link', { name: 'Iced' })).not.toHaveAttribute('aria-current')
  })

  it('scroll to the section and hand it the focus, without touching the address', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderTemplate()
    await user.click(within(nav()).getByRole('link', { name: 'Iced' }))
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(screen.getByRole('region', { name: 'Iced' })).toHaveFocus()
    expect(window.location.hash).toBe('')
  })

  it('are not drawn for a menu of one category', () => {
    renderTemplate(sampleMenu({ categories: [{ id: 'cat-hot', name: 'Hot', visible: true }, { id: 'cat-iced', name: 'Iced', visible: false }] }))
    expect(screen.queryByRole('navigation', { name: text.categoriesLabel })).toBeNull()
  })

  it('lay one mark under the name being read, hidden from a screen reader and out of the way of the row', () => {
    const { container } = renderTemplate()
    const mark = container.querySelector('nav[aria-label="' + text.categoriesLabel + '"] li[aria-hidden="true"]')
    expect(mark).not.toBeNull()
    expect(mark?.parentElement?.lastElementChild).toBe(mark)
    expect(mark).toHaveAttribute('data-placed')
    expect((mark as HTMLElement).style.transform).toContain('scaleX')
  })
})

describe('Night Glass: the words at the top', () => {
  const site = () => screen.getByRole('navigation', { name: nav.label })

  it('are links to the menu and to the Visit panel, one each side of the lamp', () => {
    renderTemplate()
    expect(within(site()).getByRole('link', { name: nav.menu })).toHaveAttribute('href', '#ng-section-0-menu')
    expect(within(site()).getByRole('link', { name: nav.visit })).toHaveAttribute('href', '#ng-section-0-visit')
    expect(document.getElementById('ng-section-0-menu')).toContainElement(screen.getByRole('region', { name: 'Hot' }))
  })

  it('scroll to the place and hand it the focus, without touching the address', async () => {
    const user = userEvent.setup()
    Element.prototype.scrollIntoView = vi.fn()
    renderTemplate()
    await user.click(within(site()).getByRole('link', { name: nav.visit }))
    expect(screen.getByRole('region', { name: text.template.visit.heading })).toHaveFocus()
    expect(window.location.hash).toBe('')
  })

  it('are left out when the shop has nothing to visit: one link to what is right below is no navigation', () => {
    renderTemplate(sampleMenu(), {}, business(noContact))
    expect(screen.queryByRole('navigation', { name: nav.label })).toBeNull()
  })
})

describe('Night Glass: the Visit panel', () => {
  const visit = () => within(screen.getByRole('region', { name: text.template.visit.heading }))

  it('says the hours, and links the directions, the phone and the social pages', () => {
    renderTemplate()
    expect(visit().getByRole('link', { name: '+63 917 555 0142' })).toHaveAttribute('href', 'tel:+639175550142')
    const directions = visit().getByRole('link', { name: text.template.visit.directionsLabel })
    expect(directions.getAttribute('href')).toContain(encodeURIComponent(business().address))
    expect(directions).toHaveAttribute('rel', 'noopener noreferrer')
    expect(visit().getByText(business().hours.split('\n')[0] as string, { exact: false })).toBeInTheDocument()
    const social = screen.getByRole('region', { name: text.template.visit.heading }).querySelectorAll('[data-fact="social"] a')
    expect(social.length).toBeGreaterThan(0)
  })

  it('comes after the menu', () => {
    renderTemplate()
    const hot = screen.getByRole('region', { name: 'Hot' })
    const panel = screen.getByRole('region', { name: text.template.visit.heading })
    expect(hot.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('drops a line with nothing behind it, and links nothing it cannot', () => {
    renderTemplate(sampleMenu(), {}, business({ address: '', phone: '' }))
    expect(visit().queryByRole('link', { name: text.template.visit.directionsLabel })).toBeNull()
    expect(screen.queryByText(text.footer.address)).toBeNull()
    expect(screen.queryByText(text.footer.phone)).toBeNull()
    expect(screen.getByText(text.footer.hours)).toBeInTheDocument()
  })

  it('is not drawn for a shop with no contact lines', () => {
    renderTemplate(sampleMenu(), {}, business(noContact))
    expect(screen.queryByRole('region', { name: text.template.visit.heading })).toBeNull()
    expect(screen.queryByRole('heading', { name: text.template.visit.heading })).toBeNull()
  })
})

describe('Night Glass: the motion', () => {
  it('marks the page live, and gives the name, the tagline and the menu their one entrance', () => {
    const { container } = renderTemplate()
    expect(container.firstElementChild).toHaveAttribute('data-live')
    const name = screen.getByRole('heading', { level: 1 })
    expect(name.className).toContain('opening')
    expect(name.nextElementSibling?.className).toContain('afterOne')
    expect(document.getElementById('ng-section-0-menu')?.className).toContain('afterTwo')
  })

  it('shows all the content when no observer is there to reveal it', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = renderTemplate()
    vi.unstubAllGlobals()
    expect(container.querySelector('[data-reveal="waiting"]')).toBeNull()
    expect(screen.getByRole('region', { name: 'Iced' })).toBeInTheDocument()
  })

  it('fades a picture in only while it loads, and an error ends the wait as well', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
    const { container, unmount } = renderTemplate()
    const picture = container.querySelector('img') as HTMLImageElement
    expect(picture).toHaveAttribute('data-loading')
    fireEvent.load(picture)
    expect(picture).not.toHaveAttribute('data-loading')
    unmount()
    const broken = renderTemplate().container.querySelector('img') as HTMLImageElement
    fireEvent.error(broken)
    expect(broken).not.toHaveAttribute('data-loading')
    complete.mockRestore()
  })

  it('never holds a picture that is already there', () => {
    const complete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    const { container } = renderTemplate()
    expect(container.querySelector('img')).not.toHaveAttribute('data-loading')
    complete.mockRestore()
  })
})

describe('Night Glass: add-ons', () => {
  const addOns = (name: string) => screen.getByRole('button', { name: fill(words.addOnsOf, { name }) })

  it('open under a text control only on a product that has them, and close again', async () => {
    const user = userEvent.setup()
    renderTemplate()
    expect(screen.queryByRole('button', { name: /Cold Brew/ })).toBeNull()
    const control = addOns('Spanish Latte')
    expect(control).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(control.getAttribute('aria-controls') as string) as HTMLElement
    expect(panel).toHaveAttribute('aria-hidden', 'true')
    expect(panel).not.toHaveAttribute('data-open')
    await user.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveAttribute('aria-hidden', 'false')
    expect(panel).toHaveAttribute('data-open')
    expect(panel).toHaveTextContent('Oat milk')
    // The sizes are printed on the row, so the panel does not say them again.
    expect(panel).not.toHaveTextContent(text.template.sizes)
    await user.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('skip a group that is no longer on the menu', () => {
    renderTemplate(sampleMenu({ groups: [] }))
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe.each(['grid', 'list'] as const)('Night Glass: the %s layout', (layout) => {
  it('sets data-layout on its root and keeps every product, tag and sold-out word', () => {
    const { container } = renderTemplate(sampleMenu(), { layout })
    expect(container.firstElementChild).toHaveAttribute('data-layout', layout)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
    expect(screen.getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(screen.getByText(text.soldOut)).toBeInTheDocument()
  })
})

describe('Night Glass: in the Design preview (not interactive)', () => {
  const preview = () => renderTemplate(sampleMenu(), { interactive: false, tags: previewTags })

  it('draws no link, button, input or tab stop, and no landmark', () => {
    const { container } = preview()
    expect(container.querySelectorAll('a, button, input, select, textarea, [tabindex]')).toHaveLength(0)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.queryByRole('main')).toBeNull()
    expect(screen.getByText('+63 917 555 0142')).toBeInTheDocument()
  })

  it('animates nothing and holds nothing back: no entrance class, no waiting section, no picture waiting to load', () => {
    const { container } = preview()
    expect(container.firstElementChild).not.toHaveAttribute('data-live')
    expect(container.querySelector('[class*="opening"], [class*="press"], [data-reveal], [data-loading], [data-placed]')).toBeNull()
  })

  it('keeps the place of the Visit panel, for the preview to scroll to, and shows the top words as plain text', () => {
    const { container } = preview()
    expect(container.querySelector('#ng-section-0-visit')).not.toBeNull()
    expect(screen.getAllByText(nav.visit).filter((word) => word.tagName === 'SPAN')).toHaveLength(1)
    expect(screen.getByText(nav.menu).tagName).toBe('SPAN')
  })

  it('still shows the category names and the add-ons word, as plain text', () => {
    preview()
    expect(screen.getAllByText('Iced').some((element) => element.tagName === 'SPAN')).toBe(true)
    expect(screen.getAllByText(words.addOns).length).toBeGreaterThan(0)
  })

  it('keeps its section ids when the menu changes under it', () => {
    const { rerender, container } = render(<Template {...propsFor(sampleMenu(), { interactive: false })} />)
    expect(container.querySelector('#ng-section-1')).not.toBeNull()
    rerender(<Template {...propsFor(sampleMenu({ categories: [{ id: 'cat-iced', name: 'Iced', visible: true }] }), { interactive: false })} />)
    expect(container.querySelector('#ng-section-1')).toBeNull()
    expect(container.querySelector('#ng-section-0')).toHaveTextContent('Iced')
  })
})
