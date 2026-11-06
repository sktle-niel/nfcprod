import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { styleTheme } from '@/entities/theme/styles'
import { sampleBusiness, sampleMenu } from '@/test/ownerFixtures'
import { MenuPreviewFrame } from './MenuPreviewFrame'

describe('MenuPreviewFrame', () => {
  it('draws the menu in the plain look whatever style the business was saved with, in the same colors', () => {
    const theme = styleTheme('noir', 'dark')
    const { container } = render(<MenuPreviewFrame business={sampleBusiness({ theme })} menu={sampleMenu()} />)
    const root = container.querySelector<HTMLElement>('[data-menu-card]')
    expect(root).toHaveAttribute('data-menu-card', 'row')
    expect(root).toHaveAttribute('data-menu-photo', 'rounded')
    expect(root).toHaveAttribute('data-menu-title', 'plain')
    expect(root).toHaveAttribute('data-menu-header', 'plain')
    expect(root).toHaveAttribute('data-menu-decor', 'none')
    expect(root).toHaveAttribute('data-menu-backdrop', 'plain')
    expect(root?.style.getPropertyValue('--menu-bg').toLowerCase()).toBe(theme.background.toLowerCase())
  })
})
