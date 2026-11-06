import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import type { BusinessType } from '@/entities/business/business'
import type { Menu, ModifierGroup, Product } from '@/entities/menu/menu'
import { sampleBusiness, sampleMenu } from '@/test/ownerFixtures'
import { visibleSections } from '../../sections'
import { motion } from '../kit'
import type { TemplateProps } from '../types'
import { Template } from './Template'

const text = copy.menu.view

function propsOf({ menu = sampleMenu(), ...patch }: Partial<TemplateProps> & { menu?: Menu } = {}): TemplateProps {
  return {
    business: sampleBusiness({ name: 'Kape Kanto', logo: null }),
    sections: visibleSections(menu),
    spotlight: null,
    groups: menu.groups,
    layout: 'list',
    tags: { name: 'h1', category: 'h2', product: 'h3' },
    interactive: true,
    idOf: (index) => `drip-section-${index}`,
    photoOf: (product) => product.image,
    placeholderOf: () => 'cup',
    ...patch,
  }
}

const renderPage = (patch: Parameters<typeof propsOf>[0] = {}) => render(<Template {...propsOf(patch)} />)

const plain = (id: string, patch: Partial<Product> = {}): Product => ({
  id,
  categoryId: 'cat-hot',
  name: id,
  description: '',
  price: 10000,
  variants: [],
  tags: [],
  available: true,
  image: null,
  groupIds: [],
  ...patch,
})
const size = (label: string, peso: number) => ({ id: label, label, price: peso * 100 })
const menuWith = (products: Product[], groups: ModifierGroup[] = sampleMenu().groups): Menu => ({ ...sampleMenu(), products, groups })
const NO_SOCIAL = { facebook: '', instagram: '', tiktok: '', website: '' }
const rowOf = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li') as HTMLElement

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the Drip page: structure', () => {
  it('draws the name, each category and each item as headings, at the levels it is given', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Hot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Americano' })).toBeInTheDocument()
  })

  it('steps every heading down one level when the page sits inside another', () => {
    renderPage({ tags: { name: 'h2', category: 'h3', product: 'h4' } })
    expect(screen.getByRole('heading', { level: 2, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Iced' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Cold Brew' })).toBeInTheDocument()
  })

  it('lists the items in a list, each in a list item, in the section named by its title', () => {
    renderPage()
    expect(rowOf('Spanish Latte').parentElement?.tagName).toBe('UL')
    const section = screen.getByRole('region', { name: 'Hot' })
    expect(section).toHaveAttribute('id', 'drip-section-0')
    expect(within(section).getByRole('heading', { name: 'Americano' })).toBeInTheDocument()
  })

  it('draws no landmark the page around it already has, and the name in one heading only', () => {
    const { container } = renderPage()
    expect(container.querySelector('main, header')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it.each(['list', 'grid'] as const)('marks the %s layout on the sheet', (layout) => {
    const { container } = renderPage({ layout })
    expect(container.firstElementChild).toHaveAttribute('data-layout', layout)
  })

  it('draws names and descriptions as text, never as markup', () => {
    const evil = '<img src="x" onerror="alert(1)">'
    const { container } = renderPage({
      menu: menuWith([plain('a', { name: evil, description: evil })]),
      business: sampleBusiness({ name: evil, tagline: evil, logo: null }),
    })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(evil)
    expect(screen.getByRole('heading', { level: 3, name: evil })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
  })
})

describe('the Drip page: the band', () => {
  const edge = (types?: BusinessType[]) => renderPage({ business: { ...sampleBusiness({ logo: null }), types } }).container

  it.each(['coffee', 'milkTea', 'bakery'] as const)('drips for a %s shop', (type) => {
    const page = edge([type])
    expect(page.firstElementChild).toHaveAttribute('data-edge', 'drip')
    expect(page.querySelector('svg[width="100%"]')).not.toBeNull()
  })

  it('drips for a hybrid that is partly a coffee shop', () => {
    expect(edge(['casualDining', 'coffee']).firstElementChild).toHaveAttribute('data-edge', 'drip')
  })

  it.each([[['fineDining'] as BusinessType[]], [['bar'] as BusinessType[]], [[]], [undefined]])('stays straight, with no drawing at all, for %j', (types) => {
    const page = edge(types)
    expect(page.firstElementChild).toHaveAttribute('data-edge', 'straight')
    expect(page.querySelector('svg[width="100%"]')).toBeNull()
  })

  it('holds the tagline with the name, and leaves it out when there is none', () => {
    const { unmount } = renderPage({ business: sampleBusiness({ tagline: 'Coffee to go' }) })
    expect(screen.getByRole('heading', { level: 1 }).parentElement).toContainElement(screen.getByText('Coffee to go'))
    unmount()

    const { container } = renderPage({ business: sampleBusiness({ name: 'Kape Kanto', tagline: '', logo: null }) })
    expect(container.querySelector('h1 + p')).toBeNull()
  })

  it('sets the name as type with no logo, and shows the logo beside it when there is one', () => {
    const { container, unmount } = renderPage()
    expect(container.querySelector('img')).toBeNull()
    unmount()

    const logo = 'https://images.example.com/logo.png'
    const { container: withLogo } = renderPage({ business: sampleBusiness({ logo }) })
    expect(withLogo.querySelector('img')).toHaveAttribute('src', logo)
    expect(withLogo.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('never draws a product picture', () => {
    const { container } = renderPage({ menu: menuWith([plain('a', { image: 'https://images.example.com/a.jpg' }), plain('b')]) })
    expect(container.querySelector('img')).toBeNull()
    expect(within(rowOf('b')).getByText('₱100')).toBeInTheDocument()
  })
})

describe('the Drip page: the category links', () => {
  it('links every category in a labeled navigation', () => {
    renderPage()
    const nav = screen.getByRole('navigation', { name: text.categoriesLabel })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Hot', 'Iced'])
    expect(links[1]).toHaveAttribute('href', '#drip-section-1')
  })

  it('marks the category being read', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Hot' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'Iced' })).not.toHaveAttribute('aria-current')
  })

  it('scrolls to the section and hands it focus, with no jump when motion is unwanted', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    renderPage()
    await user.click(screen.getByRole('link', { name: 'Iced' }))
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(screen.getByRole('region', { name: 'Iced' })).toHaveFocus()
  })
})

describe('the Drip page: the site navigation', () => {
  it('links the list and the Visit section in a labeled navigation of its own', () => {
    renderPage()
    const nav = screen.getByRole('navigation', { name: text.template.siteNav.label })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([text.template.siteNav.menu, text.template.siteNav.visit])
    expect(links[0]).toHaveAttribute('href', '#drip-section-0')
    expect(links[1]).toHaveAttribute('href', '#drip-section-0-visit')
  })

  it('stands above the name, in the band', () => {
    renderPage()
    const nav = screen.getByRole('navigation', { name: text.template.siteNav.label })
    expect(nav.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('goes to the Visit section and hands it focus', async () => {
    const user = userEvent.setup()
    Element.prototype.scrollIntoView = vi.fn()
    renderPage()
    await user.click(screen.getByRole('link', { name: text.template.siteNav.visit }))
    expect(screen.getByRole('region', { name: text.template.visit.heading })).toHaveFocus()
  })

  it('is not drawn for a shop with nothing to visit: one link to the list under it would lead nowhere', () => {
    renderPage({ business: sampleBusiness({ phone: '', address: '', hours: '', social: NO_SOCIAL }) })
    expect(screen.queryByRole('navigation', { name: text.template.siteNav.label })).toBeNull()
    expect(screen.getByRole('navigation', { name: text.categoriesLabel })).toBeInTheDocument()
  })
})

describe('the Drip page: the Visit section', () => {
  const visit = () => screen.getByRole('region', { name: text.template.visit.heading })

  it('comes after the list, at the level of the categories', () => {
    renderPage()
    expect(visit().compareDocumentPosition(screen.getByRole('region', { name: 'Iced' })) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: text.template.visit.heading })).toBeInTheDocument()
  })

  it('prints the hours, and links the phone, the directions and the social pages', () => {
    renderPage()
    expect(within(visit()).getByText(/Sat and Sun, 8 am to 10 pm/)).toBeInTheDocument()
    expect(within(visit()).getByRole('link', { name: '+63 917 555 0142' })).toHaveAttribute('href', 'tel:+639175550142')
    const directions = within(visit()).getByRole('link', { name: text.template.visit.directionsLabel })
    expect(directions.getAttribute('href')).toContain(encodeURIComponent('12 Mabini Street'))
    expect(directions).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(visit()).getByRole('link', { name: text.social.instagram })).toHaveAttribute('href', 'https://instagram.com/kapekanto')
  })

  it('has no line, no label and no link for what the shop left out', () => {
    renderPage({ business: sampleBusiness({ phone: '', address: '' }) })
    expect(within(visit()).queryByText(text.footer.phone)).toBeNull()
    expect(within(visit()).queryByText(text.footer.address)).toBeNull()
    expect(within(visit()).queryByRole('link', { name: text.template.visit.directionsLabel })).toBeNull()
    expect(within(visit()).getByText(text.footer.hours)).toBeInTheDocument()
  })

  it('is left out whole, heading included, when the shop has nothing to say there', () => {
    renderPage({ business: sampleBusiness({ phone: '', address: '', hours: '', social: NO_SOCIAL }) })
    expect(screen.queryByRole('heading', { name: text.template.visit.heading })).toBeNull()
  })

  it('never draws a social link that is not a clean https link', () => {
    renderPage({ business: sampleBusiness({ social: { ...NO_SOCIAL, facebook: 'javascript:alert(1)' } }) })
    expect(within(visit()).queryByRole('link', { name: text.social.facebook })).toBeNull()
  })

  it('stays in the preview as words with its place to scroll to, no link and no landmark', () => {
    const { container } = renderPage({ interactive: false })
    expect(container.querySelector('#drip-section-0-visit')).not.toBeNull()
    expect(screen.getByText('12 Mabini Street, Lahug, Cebu City')).toBeInTheDocument()
    expect(screen.getByText('+63 917 555 0142')).toBeInTheDocument()
  })
})

describe('the Drip page: the motion', () => {
  /** An observer that answers when the test says, and a screen on which every box measures far below the fold. */
  function belowTheFold() {
    const answers: ((entries: { isIntersecting: boolean }[]) => void)[] = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(answer: (typeof answers)[number]) {
          answers.push(answer)
        }
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect)
    return answers
  }
  const opening = String(motion.opening)
  const waiting = (container: HTMLElement) => container.querySelectorAll('[data-reveal="waiting"]')

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens once on the public page: the name rises and the edge pours', () => {
    const { container } = renderPage()
    expect(screen.getByRole('heading', { level: 1 }).className).toContain(opening)
    expect(container.querySelector('svg[data-pours]')).not.toBeNull()
  })

  it('holds still in the preview: no opening, no pour, nothing waiting, even with an observer there', () => {
    belowTheFold()
    const { container } = renderPage({ interactive: false })
    expect(screen.getByRole('heading', { level: 1 }).className).not.toContain(opening)
    expect(container.querySelector('svg[data-pours]')).toBeNull()
    expect(container.querySelector('[data-reveal]')).toBeNull()
  })

  it('keeps every section showing with no observer to bring it in', () => {
    belowTheFold()
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = renderPage()
    expect(waiting(container)).toHaveLength(0)
    expect(screen.getByText('Cold Brew')).toBeInTheDocument()
  })

  it('brings a section and the Visit section in as they near the screen, and only then', () => {
    const answers = belowTheFold()
    const { container } = renderPage()
    expect(waiting(container)).toHaveLength(3)
    for (const answer of answers) answer([{ isIntersecting: true }])
    expect(waiting(container)).toHaveLength(0)
    expect(container.querySelectorAll('[data-reveal="arriving"]')).toHaveLength(3)
  })
})

describe('the Drip page: the preview', () => {
  it('has no link, no button, no input, no tab stop and no landmark', () => {
    const { container } = renderPage({ interactive: false })
    expect(container.querySelector('a, button, input, select, textarea, [tabindex], nav')).toBeNull()
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.getByText('Iced', { selector: 'span' })).toBeInTheDocument()
  })
})

describe('the Drip page: the lines', () => {
  it('prints the price of a plain item at the end of its line, with a leader that is only decoration', () => {
    renderPage({ menu: menuWith([plain('a')]) })
    expect(rowOf('a').textContent).toBe('a₱100')
    expect(rowOf('a').querySelector('[aria-hidden="true"]')).toHaveTextContent('')
  })

  it('prints the sizes in columns: the heads once, for the eye, and every price says its own size', () => {
    renderPage()
    const section = screen.getByRole('region', { name: 'Hot' })
    const heads = [...section.querySelectorAll('[aria-hidden="true"]')].map((head) => head.textContent).filter((head) => head !== '')
    expect(heads).toEqual(['S', 'M', 'L'])
    expect(rowOf('Americano').textContent).toContain('S ₱120')
    expect(rowOf('Americano').textContent).toContain('L ₱160')
    expect(within(rowOf('Americano')).queryByText(/^From/)).toBeNull()
  })

  it('puts an item with one price in the last column, and leaves a size it does not come in empty', () => {
    const { container } = renderPage({
      menu: menuWith([
        plain('short', { variants: [size('M', 120), size('L', 140)] }),
        plain('full', { variants: [size('S', 100), size('M', 120), size('L', 140)] }),
        plain('one'),
      ]),
    })
    const line = (name: string) => rowOf(name).querySelector('[data-columns]') as HTMLElement
    expect(line('short').children).toHaveLength(3)
    expect((line('short').firstElementChild as HTMLElement).style.gridColumn).toContain('span 2')
    expect((line('one').firstElementChild as HTMLElement).style.gridColumn).toContain('span 3')
    expect(container.querySelector('section')?.style.getPropertyValue('--tpl-cols')).toBe('3')
  })

  it('prints sizes that cannot stand as column heads in words under the name, "From" on the line', () => {
    renderPage({ menu: menuWith([plain('a', { variants: [size('Good for one', 120), size('Good for two', 200)] })]) })
    expect(within(rowOf('a')).getByText('From ₱120')).toBeInTheDocument()
    expect(rowOf('a').textContent).toContain('Good for one ₱120 · Good for two ₱200')
    expect(rowOf('a').querySelector('[data-columns]')).toBeNull()
  })

  it('says sold out in words, where the prices were', () => {
    renderPage()
    const row = rowOf('Iced Caramel Macchiato')
    expect(within(row).getByText(text.soldOut)).toBeInTheDocument()
    expect(row).toHaveAttribute('data-sold-out')
    expect(within(row).queryByText(/^(From )?₱/)).toBeNull()
  })

  it('says the tags in words', () => {
    renderPage()
    expect(within(rowOf('Spanish Latte')).getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(within(rowOf('Iced Caramel Macchiato')).getByText(text.tags.new)).toBeInTheDocument()
  })

  it('prints a whole description, however long', () => {
    const long = 'Word '.repeat(60).trim()
    renderPage({ menu: menuWith([plain('a', { description: long })]) })
    expect(within(rowOf('a')).getByText(long)).toBeInTheDocument()
  })
})

describe('the Drip page: the add-ons', () => {
  const syrups: ModifierGroup = {
    id: 'grp-syrup',
    name: 'Syrups',
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: 'o1', label: 'Vanilla', price: 3000 },
      { id: 'o2', label: 'Raw sugar', price: 0 },
    ],
  }
  const withSyrup = () => menuWith([plain('a', { groupIds: ['grp-syrup'] }), plain('c')], [syrups])

  it('open under a plain text control that says so, and close again', async () => {
    const user = userEvent.setup()
    renderPage({ menu: withSyrup() })
    const toggle = screen.getByRole('button', { name: 'Add-ons for a' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(toggle.getAttribute('aria-controls') as string) as HTMLElement
    expect(panel).toHaveAttribute('inert')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel).not.toHaveAttribute('inert')
    expect(panel).toBeVisible()
    expect(panel.textContent).toContain('Vanilla')
    expect(panel.textContent).toContain('+₱30')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel).toHaveAttribute('inert')
  })

  it('print once, under the category, what every item of it has, and leave the rows without a link', async () => {
    const user = userEvent.setup()
    renderPage({ menu: menuWith([plain('a', { groupIds: ['grp-syrup'] }), plain('b', { groupIds: ['grp-syrup'] })], [syrups]) })
    expect(screen.queryByRole('button', { name: 'Add-ons for a' })).toBeNull()
    const toggle = screen.getByRole('button', { name: 'Add-ons for Hot' })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Syrups')).toBeVisible()
  })

  it('stay on the row of an item that is the only one of its category', () => {
    renderPage({ menu: menuWith([plain('a', { groupIds: ['grp-syrup'] })], [syrups]) })
    expect(screen.getByRole('button', { name: 'Add-ons for a' })).toBeInTheDocument()
  })

  it('draw no control for an item with none, an id that is not on the menu, or a group with no options', () => {
    const empty = { ...syrups, id: 'grp-empty', options: [] }
    renderPage({ menu: menuWith([plain('a', { groupIds: ['grp-gone', 'grp-empty'] }), plain('c')], [syrups, empty]) })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('are named in the preview with no control, and print nothing that opens', () => {
    renderPage({ menu: withSyrup(), interactive: false })
    expect(within(rowOf('a')).getByText('Add-ons')).toBeInTheDocument()
    expect(screen.queryByText('Vanilla')).toBeNull()
  })
})
