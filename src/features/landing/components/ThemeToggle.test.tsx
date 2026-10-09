import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.dataset['theme'] = 'light'
    localStorage.clear()
  })

  it('switches between light and dark and remembers the choice', async () => {
    render(<ThemeToggle />)
    const toggle = screen.getByRole('switch', { name: /dark mode/i })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(toggle)
    expect(document.documentElement.dataset['theme']).toBe('dark')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem('theme')).toBe('dark')

    await userEvent.click(toggle)
    expect(document.documentElement.dataset['theme']).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
