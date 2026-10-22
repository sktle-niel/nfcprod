import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

function Harness({ onChange }: { onChange?: (checked: boolean) => void }) {
  const [checked, setChecked] = useState(false)
  return (
    <Switch
      label="Menu is live"
      description="Customers can open the link"
      checked={checked}
      onChange={(next) => {
        setChecked(next)
        onChange?.(next)
      }}
    />
  )
}

describe('Switch', () => {
  it('is a switch named by its label and described by its description', () => {
    render(<Harness />)
    const toggle = screen.getByRole('switch', { name: 'Menu is live' })
    expect(toggle).toHaveAccessibleDescription('Customers can open the link')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('has no description when none is given', () => {
    render(<Switch label="Live" checked onChange={() => {}} />)
    expect(screen.getByRole('switch', { name: 'Live' })).not.toHaveAttribute('aria-describedby')
  })

  it('reports the new value when clicked, on and then off', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    const toggle = screen.getByRole('switch')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    await user.click(toggle)
    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('flips with Space and Enter like a native checkbox, and takes part in the tab order', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.tab()
    expect(screen.getByRole('switch')).toHaveFocus()
    await user.keyboard(' ')
    await user.keyboard('{Enter}')
    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('follows the checked prop: it does not flip by itself', async () => {
    render(<Switch label="Live" checked={false} onChange={() => {}} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('does nothing while busy and says it is busy', async () => {
    const onChange = vi.fn()
    render(<Switch label="Live" checked={false} busy onChange={onChange} />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-disabled', 'true')
    expect(toggle).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(toggle)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps keyboard focus while busy, and ignores Space and Enter', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<Switch label="Live" checked={false} onChange={onChange} />)
    await user.tab()
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveFocus()
    rerender(<Switch label="Live" checked={false} busy onChange={onChange} />)
    expect(toggle).not.toBeDisabled()
    expect(toggle).toHaveFocus()
    await user.keyboard(' ')
    await user.keyboard('{Enter}')
    expect(onChange).not.toHaveBeenCalled()
    rerender(<Switch label="Live" checked={false} onChange={onChange} />)
    expect(toggle).not.toHaveAttribute('aria-disabled')
    await user.keyboard(' ')
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does nothing while disabled', async () => {
    const onChange = vi.fn()
    render(<Switch label="Live" checked={false} disabled onChange={onChange} />)
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByRole('switch')).not.toHaveAttribute('aria-busy')
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
