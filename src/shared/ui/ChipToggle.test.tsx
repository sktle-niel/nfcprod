import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ChipGroup, ChipToggle } from './ChipToggle'

function Harness({ onChange }: { onChange?: (tag: string, checked: boolean) => void }) {
  const [tags, setTags] = useState<string[]>(['vegan'])
  const toggle = (tag: string) => (checked: boolean) => {
    setTags((now) => (checked ? [...now, tag] : now.filter((item) => item !== tag)))
    onChange?.(tag, checked)
  }
  return (
    <ChipGroup legend="Tags" hint="Shown as badges">
      <ChipToggle label="Vegan" checked={tags.includes('vegan')} onChange={toggle('vegan')} />
      <ChipToggle label="Spicy" checked={tags.includes('spicy')} onChange={toggle('spicy')} />
    </ChipGroup>
  )
}

describe('ChipToggle', () => {
  it('is a checkbox named by its label, with its checked state', () => {
    render(<Harness />)
    expect(screen.getByRole('checkbox', { name: 'Vegan' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Spicy' })).not.toBeChecked()
  })

  it('reports the new checked value when the chip is clicked', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(screen.getByText('Spicy'))
    expect(onChange).toHaveBeenCalledWith('spicy', true)
    expect(screen.getByRole('checkbox', { name: 'Spicy' })).toBeChecked()
    await userEvent.click(screen.getByText('Vegan'))
    expect(onChange).toHaveBeenLastCalledWith('vegan', false)
  })

  it('toggles with Space from the keyboard', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Vegan' })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: 'Vegan' })).not.toBeChecked()
  })

  it('does not change while disabled', async () => {
    const onChange = vi.fn()
    render(<ChipToggle label="Vegan" checked={false} disabled onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Vegan' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('ChipGroup', () => {
  it('is a group named by its legend', () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: 'Tags' })).toBeInTheDocument()
    expect(screen.getByText('Shown as badges')).toBeInTheDocument()
  })

  it('needs no hint', () => {
    render(
      <ChipGroup legend="Tags">
        <ChipToggle label="Vegan" checked={false} onChange={() => {}} />
      </ChipGroup>,
    )
    expect(screen.getByRole('group', { name: 'Tags' })).toBeInTheDocument()
  })
})
