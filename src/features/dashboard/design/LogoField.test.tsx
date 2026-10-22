import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LogoField } from './LogoField'
import type { DesignForm } from './useDesignDraft'

// Only what the field reads. The repository refuses a logo outside the picture storage, so the page cannot be set up with one.
function formWith(logo: string | null): DesignForm {
  return {
    draft: { logo },
    uploading: false,
    busy: false,
    logoError: null,
    errors: {},
    pickLogo: vi.fn(),
    removeLogo: vi.fn(),
  } as unknown as DesignForm
}

describe('LogoField', () => {
  it('shows a logo from the picture storage', () => {
    render(<LogoField form={formWith('https://images.example.com/logo.png')} />)
    expect(screen.getByRole('img', { name: 'Your logo' })).toHaveAttribute('src', 'https://images.example.com/logo.png')
  })

  it.each(['https://tracker.example.com/logo.png', 'http://images.example.com/logo.png', 'javascript:alert(1)'])(
    'draws %s as no logo, like the menu does',
    (logo) => {
      render(<LogoField form={formWith(logo)} />)
      expect(screen.queryByRole('img', { name: 'Your logo' })).not.toBeInTheDocument()
      expect(screen.getByText('No logo yet')).toBeInTheDocument()
    },
  )
})
