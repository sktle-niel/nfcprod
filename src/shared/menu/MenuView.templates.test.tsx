import { act, render, screen } from '@testing-library/react'
import { lazy, type ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { styleTheme } from '@/entities/theme/styles'
import { sampleBusiness, sampleMenu } from '@/test/ownerFixtures'
import { MenuView } from './MenuView'
import type { TemplateProps } from './templates/types'
import styles from './MenuView.module.css'

// `drip` is a chunk that never downloads, `sandstone` one that is still on its way, `nightglass` one that arrives.
vi.mock('./templates', () => {
  const never = new Promise<{ default: ComponentType<TemplateProps> }>(() => undefined)
  const drawn = (props: TemplateProps) => <p data-testid="template">{props.business.name}</p>
  return {
    TEMPLATES: {
      drip: lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module'))),
      sandstone: lazy(() => never),
      nightglass: lazy(() => Promise.resolve({ default: drawn })),
    },
  }
})

const shown = (style: 'drip' | 'sandstone' | 'nightglass', interactive = true) =>
  render(<MenuView business={sampleBusiness({ theme: styleTheme(style, 'light') })} menu={sampleMenu()} interactive={interactive} />)

describe('MenuView: a template that is a chunk of its own', () => {
  // React logs the error it hands the boundary.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined))
  afterEach(() => vi.restoreAllMocks())

  it('draws the template above the page photo layer', async () => {
    const { container } = shown('nightglass')
    const template = await screen.findByTestId('template')
    expect(template.parentElement).toHaveClass(styles.content as string)
    expect(container.querySelector('[data-menu-template]')).toHaveAttribute('data-menu-template', 'nightglass')
  })

  it('says it is loading while the chunk is on its way, and draws no half page', async () => {
    shown('sandstone')
    await act(async () => Promise.resolve())
    expect(screen.getByRole('status')).toHaveTextContent('Loading the menu')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('stays quiet in a preview while the chunk is on its way', async () => {
    shown('sandstone', false)
    await act(async () => Promise.resolve())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the error and the whole menu in the Classic look when the chunk fails, with a way to reload', async () => {
    const menu = sampleMenu()
    shown('drip')
    expect(await screen.findByRole('alert')).toHaveTextContent('could not load its design')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
    expect(menu.products.length).toBeGreaterThan(0)
  })

  it('has no tab stop in a preview when the chunk fails', async () => {
    shown('drip', false)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('starts over when another template is chosen', async () => {
    const business = sampleBusiness({ theme: styleTheme('drip', 'light') })
    const { rerender } = render(<MenuView business={business} menu={sampleMenu()} />)
    await screen.findByRole('alert')
    rerender(<MenuView business={{ ...business, theme: styleTheme('nightglass', 'light') }} menu={sampleMenu()} />)
    expect(await screen.findByTestId('template')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
