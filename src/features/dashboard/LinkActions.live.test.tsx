import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LinkActions } from './LinkActions'

// With a real backend the menu is public, so Open goes to the public address, in a new tab.
vi.mock('@/data/ownerRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/ownerRepository')>()),
  ownerDemo: false,
}))

const text = dashboardCopy.share.link
const url = 'https://menu.test/m/kape-kanto'

describe('LinkActions with a real backend', () => {
  it('opens the public address in a new tab without leaking the opener', () => {
    render(<LinkActions url={url} />, { wrapper: MemoryRouter })
    const open = screen.getByRole('link', { name: `${text.open} ${text.newTab}` })
    expect(open).toHaveAttribute('href', url)
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: text.open })).not.toBeInTheDocument()
  })
})
