import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Tab, TabList, TabPanel, Tabs } from './Tabs'

function Harness({ initial = 'items', onChange }: { initial?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <Tabs
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    >
      <TabList label="Menu sections">
        <Tab value="items">Items</Tab>
        <Tab value="addons">Add-ons</Tab>
        <Tab value="extra">Extra</Tab>
      </TabList>
      <TabPanel value="items">Item list</TabPanel>
      <TabPanel value="addons">Add-on list</TabPanel>
      <TabPanel value="extra">Extra list</TabPanel>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('names the tab list and marks the selected tab', () => {
    render(<Harness />)
    expect(screen.getByRole('tablist', { name: 'Menu sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Add-ons' })).toHaveAttribute('aria-selected', 'false')
  })

  it('shows only the selected panel, named by its tab, and links tab and panel by id', () => {
    render(<Harness />)
    const panel = screen.getByRole('tabpanel', { name: 'Items' })
    expect(panel).toHaveTextContent('Item list')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-controls', panel.id)
    expect(screen.getByText('Add-on list')).not.toBeVisible()
  })

  it('keeps one tab in the tab order (roving tabindex)', () => {
    render(<Harness />)
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Add-ons' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: 'Extra' })).toHaveAttribute('tabindex', '-1')
  })

  it('selects a tab when it is clicked', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Add-ons' }))
    expect(onChange).toHaveBeenCalledWith('addons')
    expect(screen.getByRole('tabpanel', { name: 'Add-ons' })).toHaveTextContent('Add-on list')
  })

  it('moves with ArrowRight and ArrowLeft, wrapping at both ends', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Add-ons' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Add-ons' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Extra' })).toHaveFocus()
    expect(screen.getByRole('tabpanel', { name: 'Extra' })).toBeVisible()
  })

  it('jumps to the first and last tab with Home and End', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Extra' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Items' })).toHaveAttribute('aria-selected', 'true')
  })

  it('leaves other keys alone', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.tab()
    await user.keyboard('a{ArrowDown}')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('skips a disabled tab when moving with the keys', async () => {
    const user = userEvent.setup()
    render(
      <Tabs value="a" onChange={() => {}}>
        <TabList label="Sections">
          <Tab value="a">A</Tab>
          <Tab value="b" disabled>
            B
          </Tab>
          <Tab value="c">C</Tab>
        </TabList>
      </Tabs>,
    )
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'C' })).toHaveFocus()
  })

  it('gives two Tabs on one page their own ids', () => {
    render(
      <>
        <Harness initial="addons" />
        <Harness initial="items" />
      </>,
    )
    const panels = screen.getAllByRole('tabpanel')
    expect(panels).toHaveLength(2)
    expect(panels[0]?.id).not.toBe(panels[1]?.id)
    expect(screen.getByRole('tabpanel', { name: 'Add-ons' })).toBeVisible()
  })

  it('refuses a tab outside Tabs with a clear error', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Tab value="x">X</Tab>)).toThrow('inside Tabs')
    quiet.mockRestore()
  })
})
