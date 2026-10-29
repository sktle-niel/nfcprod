import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { copy } from '@/config/copy'
import type { Menu, Product } from '@/entities/menu/menu'
import { DEFAULT_THEME } from '@/entities/theme/theme'
import { MenuPreviewFrame } from './MenuPreviewFrame'
import { MenuView, type MenuViewBusiness } from './MenuView'

const text = copy.menu.view

const PHOTO = 'https://images.example.com/photo.jpg'
// The first eight bytes of a PNG: enough for the picture check, which reads the signature.
const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

function business(patch: Partial<MenuViewBusiness> = {}): MenuViewBusiness {
  return {
    name: 'Cafe Luna',
    tagline: 'Coffee at midnight',
    logo: null,
    phone: '',
    address: '',
    hours: '',
    social: { facebook: '', instagram: '', tiktok: '', website: '' },
    theme: DEFAULT_THEME,
    ...patch,
  }
}

function product(id: string, categoryId: string, patch: Partial<Product> = {}): Product {
  return {
    id,
    categoryId,
    name: `Item ${id}`,
    description: '',
    price: 12000,
    variants: [],
    tags: [],
    available: true,
    image: null,
    groupIds: [],
    ...patch,
  }
}

function menu(patch: Partial<Menu> = {}): Menu {
  return {
    categories: [
      { id: 'c1', name: 'Coffee', visible: true },
      { id: 'c2', name: 'Secret', visible: false },
      { id: 'c3', name: 'Empty shelf', visible: true },
      { id: 'c4', name: 'Pastry', visible: true },
    ],
    products: [
      product('latte', 'c1', { name: 'Latte', description: 'Milky and warm', price: 12000 }),
      product('hidden', 'c2', { name: 'Hidden drink' }),
      product('croissant', 'c4', { name: 'Croissant', price: 9550 }),
    ],
    groups: [],
    ...patch,
  }
}

describe('MenuView', () => {
  it('shows the header, the visible categories and their products in order', () => {
    render(<MenuView business={business()} menu={menu()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Cafe Luna' })).toBeInTheDocument()
    expect(screen.getByText('Coffee at midnight')).toBeInTheDocument()
    const titles = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(titles).toEqual(['Coffee', 'Pastry'])
    expect(screen.getByRole('heading', { name: 'Latte' })).toBeInTheDocument()
    expect(screen.getByText('Milky and warm')).toBeInTheDocument()
    expect(screen.getByText('₱120')).toBeInTheDocument()
    expect(screen.getByText('₱95.50')).toBeInTheDocument()
  })

  it('skips a hidden category and a category with no products', () => {
    render(<MenuView business={business()} menu={menu()} />)
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
    expect(screen.queryByText('Hidden drink')).not.toBeInTheDocument()
    expect(screen.queryByText('Empty shelf')).not.toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: text.categoriesLabel })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Coffee', 'Pastry'])
  })

  it('points each navigation link at the section it names, scrolls there and hands focus to it', async () => {
    const original = Element.prototype.scrollIntoView
    const scrolled: Element[] = []
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
      scrolled.push(this)
    }
    try {
      render(<MenuView business={business()} menu={menu()} />)
      const link = screen.getByRole('link', { name: 'Pastry' })
      const section = document.getElementById(link.getAttribute('href')?.slice(1) ?? '')
      expect(section).toBe(screen.getByRole('region', { name: 'Pastry' }))
      await userEvent.setup().click(link)
      expect(scrolled).toEqual([section])
      expect(section).toHaveFocus()
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('marks a sold out product but still lists it', () => {
    const sold = menu({ products: [product('a', 'c1', { name: 'Latte', available: false }), product('b', 'c1', { name: 'Mocha' })] })
    render(<MenuView business={business()} menu={sold} />)
    const items = screen.getAllByRole('listitem').filter((item) => item.querySelector('h3'))
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText(text.soldOut)).toBeInTheDocument()
    expect(within(items[1]!).queryByText(text.soldOut)).not.toBeInTheDocument()
  })

  it('shows "from" and the variants when a product has sizes', () => {
    const sized = menu({
      products: [
        product('a', 'c1', {
          name: 'Latte',
          price: 12000,
          variants: [
            { id: 'v1', label: 'S', price: 12000 },
            { id: 'v2', label: 'M', price: 14000 },
          ],
        }),
      ],
    })
    render(<MenuView business={business()} menu={sized} />)
    expect(screen.getByText('From ₱120')).toBeInTheDocument()
    expect(screen.getByText('S ₱120 · M ₱140')).toBeInTheDocument()
  })

  it('reads the lowest price from the variants, not from the stored price', () => {
    const odd = menu({
      products: [product('a', 'c1', { price: 99900, variants: [{ id: 'v1', label: 'L', price: 20000 }, { id: 'v2', label: 'S', price: 15000 }] })],
    })
    render(<MenuView business={business()} menu={odd} />)
    expect(screen.getByText('From ₱150')).toBeInTheDocument()
  })

  it('shows a label for each tag', () => {
    const tagged = menu({ products: [product('a', 'c1', { tags: ['bestSeller', 'glutenFree'] })] })
    render(<MenuView business={business()} menu={tagged} />)
    expect(screen.getByText(text.tags.bestSeller)).toBeInTheDocument()
    expect(screen.getByText(text.tags.glutenFree)).toBeInTheDocument()
    expect(screen.queryByText(text.tags.spicy)).not.toBeInTheDocument()
  })

  it('hints at add-ons only when the product has a group that exists', () => {
    const group = { id: 'g1', name: 'Milk', required: false, min: 0, max: 1, options: [] }
    const withGroups = menu({
      products: [
        product('a', 'c1', { name: 'Latte', groupIds: ['g1'] }),
        product('b', 'c1', { name: 'Tea', groupIds: ['gone'] }),
        product('c', 'c1', { name: 'Water' }),
      ],
      groups: [group],
    })
    render(<MenuView business={business()} menu={withGroups} />)
    expect(screen.getAllByText(text.addOnsAvailable)).toHaveLength(1)
  })

  it('shows a photo as lazy decoration only when the product has one', () => {
    const photo = menu({ products: [product('a', 'c1', { image: PHOTO }), product('b', 'c1')] })
    const { container } = render(<MenuView business={business()} menu={photo} />)
    const pictures = container.querySelectorAll('img')
    expect(pictures).toHaveLength(1)
    expect(pictures[0]).toHaveAttribute('src', PHOTO)
    expect(pictures[0]).toHaveAttribute('loading', 'lazy')
    expect(pictures[0]).toHaveAttribute('alt', '')
  })

  it('shows the logo when there is one', () => {
    const { container } = render(<MenuView business={business({ logo: 'https://images.example.com/logo.png' })} menu={menu()} />)
    expect(container.querySelector('img[src="https://images.example.com/logo.png"]')).not.toBeNull()
  })

  it('draws a picture that is a real PNG data address', () => {
    const { container } = render(
      <MenuView business={business({ logo: PNG_DATA_URL })} menu={menu({ products: [product('a', 'c1', { image: PNG_DATA_URL })] })} />,
    )
    expect(container.querySelectorAll(`img[src="${PNG_DATA_URL}"]`)).toHaveLength(2)
  })

  it.each([
    ['a plain http address', 'http://images.example.com/p.jpg'],
    ['an https address on a host that is not the storage', 'https://tracker.example.com/p.gif'],
    ['a script address', 'javascript:alert(1)'],
    ['an SVG data address', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
    ['a data address whose bytes are not a picture', 'data:image/png;base64,AAAAAAAAAAAA'],
    ['a blob address', 'blob:https://example.com/abc'],
    ['an address with no host dot', 'https://localhost/p.jpg'],
  ])('does not draw the logo or a product photo given as %s', (_name, address) => {
    const hostile = menu({ products: [product('a', 'c1', { image: address })] })
    const { container } = render(<MenuView business={business({ logo: address })} menu={hostile} />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows an empty state when nothing can be shown', () => {
    render(<MenuView business={business()} menu={{ categories: [], products: [], groups: [] }} />)
    expect(screen.getByText(text.empty)).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('shows the empty state when every category is hidden', () => {
    const hidden = menu({ categories: [{ id: 'c1', name: 'Coffee', visible: false }] })
    render(<MenuView business={business()} menu={hidden} />)
    expect(screen.getByText(text.empty)).toBeInTheDocument()
  })

  it('puts the theme on the root as custom properties and picks the layout', () => {
    const { container } = render(
      <MenuView business={business({ theme: { ...DEFAULT_THEME, primary: '#ff0000', background: '#fafafa', layout: 'list' } })} menu={menu()} />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--menu-accent')).toBe('#ff0000')
    expect(root.style.getPropertyValue('--menu-bg')).toBe('#fafafa')
    expect(root.style.getPropertyValue('--menu-text')).toBe(DEFAULT_THEME.secondary)
    expect(root).toHaveAttribute('data-menu-layout', 'list')
  })

  it.each([
    ['row', 'grid', 'many'],
    ['tile', 'grid', 'many'],
    ['badge', 'grid', 'many'],
    ['row', 'list', 'one'],
    ['leader', 'grid', 'one'],
    ['outline', 'grid', 'one'],
    ['soft', 'grid', 'one'],
    ['plate', 'grid', 'one'],
    ['poster', 'list', 'wide'],
    ['poster', 'grid', 'wide'],
  ] as const)('tells the stylesheet the columns of the %s card in the %s layout: %s', (card, layout, columns) => {
    const { container } = render(<MenuView business={business({ theme: { ...DEFAULT_THEME, card, layout } })} menu={menu()} />)
    expect(container.firstElementChild).toHaveAttribute('data-menu-columns', columns)
  })

  it('falls back to safe values for a theme that skipped validation', () => {
    const broken = { ...DEFAULT_THEME, primary: 'red; background: url(x)', layout: 'wide' } as unknown as MenuViewBusiness['theme']
    const { container } = render(<MenuView business={business({ theme: broken })} menu={menu()} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--menu-accent')).toBe(DEFAULT_THEME.primary)
    expect(root).toHaveAttribute('data-menu-layout', 'grid')
  })

  it('uses a level 2 name when it sits inside another page', () => {
    render(<MenuView business={business()} menu={menu()} headingLevel={2} />)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Cafe Luna' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Coffee' })).toBeInTheDocument()
  })

  it('renders names as text, never as markup', () => {
    const hostile = menu({ products: [product('a', 'c1', { name: '<img src=x onerror=alert(1)>' })] })
    const { container } = render(<MenuView business={business()} menu={hostile} />)
    expect(screen.getByRole('heading', { name: '<img src=x onerror=alert(1)>' })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('MenuView footer', () => {
  it('shows nothing when the business has no contact details', () => {
    const { container } = render(<MenuView business={business()} menu={menu()} />)
    expect(container.querySelector('footer')).toBeNull()
  })

  it('links the phone as tel: with only digits and a plus', () => {
    render(<MenuView business={business({ phone: '+63 (917) 123-4567' })} menu={menu()} />)
    expect(screen.getByRole('link', { name: '+63 (917) 123-4567' })).toHaveAttribute('href', 'tel:+639171234567')
  })

  it('does not link a phone that has no digits', () => {
    render(<MenuView business={business({ phone: 'ask at the door' })} menu={menu()} />)
    expect(screen.getByText('ask at the door')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ask at the door' })).not.toBeInTheDocument()
  })

  it('shows the address and keeps the line breaks of the hours', () => {
    render(<MenuView business={business({ address: '12 Rizal St, Cebu', hours: 'Mon-Fri 8-5\nSat 9-2' })} menu={menu()} />)
    expect(screen.getByText('12 Rizal St, Cebu')).toBeInTheDocument()
    const hours = screen.getByText((_, node) => node?.textContent === 'Mon-Fri 8-5\nSat 9-2' && node.tagName === 'P')
    expect(hours.className).toMatch(/hours/)
  })

  it('opens social links in a new tab with rel noopener noreferrer', () => {
    const social = { facebook: 'https://facebook.com/cafeluna', instagram: '', tiktok: '', website: 'https://cafeluna.ph/' }
    render(<MenuView business={business({ social })} menu={menu()} />)
    for (const name of [text.social.facebook, text.social.website]) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    expect(screen.getByRole('link', { name: text.social.facebook })).toHaveAttribute('href', 'https://facebook.com/cafeluna')
    expect(screen.queryByRole('link', { name: text.social.instagram })).not.toBeInTheDocument()
  })

  it('does not draw a social link that is not https', () => {
    const social = {
      facebook: 'http://facebook.com/cafeluna',
      instagram: 'javascript:alert(1)',
      tiktok: 'ftp://tiktok.com/x',
      website: '//evil.example.com',
    }
    const { container } = render(<MenuView business={business({ social })} menu={menu()} />)
    expect(container.querySelector('footer')).toBeNull()
    expect(screen.queryByRole('link', { name: /facebook|instagram|tiktok|website/i })).not.toBeInTheDocument()
  })
})

describe('MenuView with interactive off', () => {
  const contact = {
    phone: '+63 917 555 0142',
    social: { facebook: 'https://facebook.com/cafeluna', instagram: 'https://instagram.com/cafeluna', tiktok: '', website: '' },
  }

  it('keeps the words of the categories, the phone and the social links but draws no link', () => {
    const { container } = render(<MenuView business={business(contact)} menu={menu()} interactive={false} />)
    expect(container.querySelector('a')).toBeNull()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    const row = screen.getAllByRole('list')[0]!
    expect(within(row).getByText('Coffee')).toBeInTheDocument()
    expect(within(row).getByText('Pastry')).toBeInTheDocument()
    expect(screen.getByText('+63 917 555 0142')).toBeInTheDocument()
    expect(screen.getByText(text.social.facebook)).toBeInTheDocument()
    expect(screen.getByText(text.social.instagram)).toBeInTheDocument()
  })

  it('adds no landmark of its own: the category row has no navigation role and the sections have no region role', () => {
    render(<MenuView business={business(contact)} menu={menu()} interactive={false} headingLevel={2} />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    // The words are still there, as headings and a list.
    expect(screen.getByRole('heading', { name: 'Coffee' })).toBeInTheDocument()
  })

  it('keeps the navigation and the regions on the public page', () => {
    render(<MenuView business={business(contact)} menu={menu()} />)
    expect(screen.getByRole('navigation', { name: text.categoriesLabel })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Coffee' })).toBeInTheDocument()
  })

  it('still draws the links by default', () => {
    render(<MenuView business={business(contact)} menu={menu()} />)
    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('still scrolls the box around the preview to the category a tap lands on, and nothing else', async () => {
    const { container } = render(
      <div style={{ overflowY: 'auto' }}>
        <MenuView business={business(contact)} menu={menu()} interactive={false} />
      </div>,
    )
    const box = container.firstElementChild as HTMLElement
    const scrolled: ScrollToOptions[] = []
    box.scrollTo = (options?: ScrollToOptions | number) => {
      if (typeof options === 'object') scrolled.push(options)
    }
    const row = screen.getAllByRole('list')[0]!
    await userEvent.setup().click(within(row).getByText('Pastry'))
    expect(scrolled).toHaveLength(1)
    expect(scrolled[0]).toMatchObject({ top: 0 })
    expect(document.activeElement).toBe(document.body)
  })
})

describe('MenuPreviewFrame', () => {
  it('holds the menu in a labelled region that scrolls', () => {
    render(<MenuPreviewFrame business={business()} menu={menu()} />)
    const frame = screen.getByRole('region', { name: text.previewLabel })
    expect(frame).toHaveAttribute('tabindex', '0')
    expect(within(frame).getByRole('heading', { level: 2, name: 'Cafe Luna' })).toBeInTheDocument()
  })

  it('has no link and no tab stop inside, only the frame itself', async () => {
    const social = { facebook: 'https://facebook.com/cafeluna', instagram: 'https://instagram.com/cafeluna', tiktok: '', website: '' }
    const user = userEvent.setup()
    const { container } = render(
      <MenuPreviewFrame business={business({ phone: '+63 917 555 0142', social })} menu={menu()} />,
    )
    const frame = screen.getByRole('region', { name: text.previewLabel })
    expect(frame.querySelector('a, button, input, select, textarea, summary, [href], [tabindex]')).toBeNull()
    await user.tab()
    expect(frame).toHaveFocus()
    await user.tab()
    expect(container).not.toContainElement(document.activeElement as HTMLElement)
  })
})
