import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { STOCK_PHOTOS, type StockId } from '@/entities/theme/stockPhotos'
import { styleTheme } from '@/entities/theme/styles'
import type { Theme } from '@/entities/theme/theme'
import { MenuPreviewFrame } from '@/shared/menu/MenuPreviewFrame'
import { sampleBusiness, sampleMenu } from '@/test/ownerFixtures'
import { MenuFrame } from './MenuFrame'

const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/** The frame and the menu root inside it, with the business's theme asking for a photo backdrop at `address`. */
function page(address: string) {
  const business = sampleBusiness()
  const themed = { ...business, theme: { ...business.theme, backdrop: 'picture' as const, backdropPicture: address } }
  const { container } = render(<MenuFrame business={themed} menu={sampleMenu()} />)
  return {
    main: container.querySelector('main'),
    root: container.querySelector<HTMLElement>('[data-menu-backdrop]'),
  }
}

describe('MenuFrame and the photo backdrop', () => {
  it('paints a photo the page may show on the frame and on the menu root alike', () => {
    const { main, root } = page(PHOTO)
    expect(main?.style.getPropertyValue('--menu-backdrop-image')).toContain(`url("${PHOTO}")`)
    expect(root?.style.getPropertyValue('--menu-backdrop-image')).toContain(`url("${PHOTO}")`)
  })

  it("refuses an address outside the picture storage on the frame too: 'none' everywhere, nothing to inherit", () => {
    // Custom properties inherit: if the frame painted the raw address while the root refused it, the root's
    // [data-menu-backdrop='picture'] rule would paint the frame's value. Both must go through the same gate.
    const { main, root } = page('https://evil.example/pixel.png')
    expect(main?.style.getPropertyValue('--menu-backdrop-image')).toBe('none')
    expect(root?.style.getPropertyValue('--menu-backdrop-image')).toBe('none')
  })
})

describe('MenuFrame and the plain look', () => {
  it('draws the menu plain and paints no texture of an older style on the frame or on the menu root', () => {
    // Noir was saved with a drawn texture. The frame's variables inherit into the menu, so both must agree on none.
    const business = sampleBusiness({ theme: styleTheme('noir', 'dark') })
    const { container } = render(<MenuFrame business={business} menu={sampleMenu()} />)
    const root = container.querySelector<HTMLElement>('[data-menu-card]')
    expect(root).toHaveAttribute('data-menu-card', 'row')
    expect(root).toHaveAttribute('data-menu-backdrop', 'plain')
    expect(container.querySelector('main')?.style.getPropertyValue('--menu-backdrop-image')).not.toContain('url(')
    expect(root?.style.getPropertyValue('--menu-backdrop-image')).not.toContain('url(')
  })
})

describe('MenuFrame and the library photo', () => {
  /** The frame and the menu root inside it, with the business's theme asking for the library backdrop with `id`. */
  function libraryPage(id: unknown) {
    const business = sampleBusiness()
    const themed = { ...business, theme: { ...business.theme, backdrop: 'stock' as const, backdropStock: id as StockId | null } }
    const { container } = render(<MenuFrame business={themed} menu={sampleMenu()} />)
    return {
      main: container.querySelector('main'),
      root: container.querySelector<HTMLElement>('[data-menu-backdrop]'),
    }
  }

  it('paints a library photo on the frame and on the menu root alike, from the table path', () => {
    const photo = STOCK_PHOTOS[0]
    const { main, root } = libraryPage(photo.id)
    expect(main?.style.getPropertyValue('--menu-backdrop-image')).toContain(`url("/stock/${photo.file}.jpg")`)
    expect(root?.style.getPropertyValue('--menu-backdrop-image')).toContain(`url("/stock/${photo.file}.jpg")`)
  })

  it("pins 'none' on the frame too for an id the table does not have: nothing to inherit", () => {
    const { main, root } = libraryPage('../../etc/passwd')
    expect(main?.style.getPropertyValue('--menu-backdrop-image')).toBe('none')
    expect(root?.style.getPropertyValue('--menu-backdrop-image')).toBe('none')
  })
})

describe('the public page, the owner preview and the Design preview', () => {
  const noMenu = { ...sampleMenu(), categories: [], products: [] }
  const drawn = (frame: 'page' | 'preview', theme: Theme, menu = sampleMenu()) => {
    const business = sampleBusiness({ theme })
    const Frame = frame === 'page' ? MenuFrame : MenuPreviewFrame
    const { container, unmount } = render(<Frame business={business} menu={menu} />)
    const root = container.querySelector<HTMLElement>('[data-menu-card]')!
    const attributes = Object.fromEntries(root.getAttributeNames().filter((name) => name.startsWith('data-')).map((name) => [name, root.getAttribute(name)]))
    const look = { attributes, bg: root.style.getPropertyValue('--menu-bg') }
    unmount()
    return look
  }

  it.each<[string, Theme, ReturnType<typeof sampleMenu>, string | null]>([
    ['a retired style, drawn as Daybreak', styleTheme('noir', 'dark'), sampleMenu(), 'daybreak'],
    ['an unknown style, drawn as Daybreak', { ...styleTheme('noir', 'dark'), style: 'gone' as Theme['style'] }, sampleMenu(), 'daybreak'],
    ['a template', styleTheme('sandstone', 'light'), sampleMenu(), 'sandstone'],
    ['a template with an empty menu', styleTheme('sandstone', 'light'), noMenu, null],
  ])('agree on %s', (_name, theme, menu, template) => {
    const page = drawn('page', theme, menu)
    expect(drawn('preview', theme, menu)).toEqual(page)
    expect(page.attributes['data-menu-template'] ?? null).toBe(template)
    expect(page.attributes['data-menu-card']).toBe('row')
  })
})
