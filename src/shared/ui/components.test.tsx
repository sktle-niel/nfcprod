import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Avatar } from './Avatar'
import { BarList } from './BarList'
import { MiniBars } from './MiniBars'
import { SegmentedControl } from './SegmentedControl'
import { Sparkline } from './Sparkline'
import { StatTile } from './StatTile'

describe('StatTile', () => {
  it('shows the value and a signed change against a named period', () => {
    render(<StatTile label="Orders" value="22" delta={12.5} versus="vs previous 30 days" />)
    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
    expect(screen.getByText('+12.5%')).toBeInTheDocument()
    expect(screen.getByText('vs previous 30 days')).toBeInTheDocument()
  })

  it('writes a drop with a minus sign', () => {
    render(<StatTile label="Revenue" value="₱1" delta={-4.3} />)
    expect(screen.getByText('−4.3%')).toBeInTheDocument()
  })

  it('writes no change as 0% without a sign', () => {
    render(<StatTile label="Revenue" value="₱1" delta={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('shows no change when there is nothing to compare with', () => {
    render(<StatTile label="Revenue" value="₱1" delta={null} versus="vs previous 30 days" />)
    expect(screen.queryByText(/vs previous/)).not.toBeInTheDocument()
  })
})

describe('StatTile while loading', () => {
  it('keeps its name and swaps the numbers for skeleton blocks that nobody reads out', () => {
    const { container } = render(
      <StatTile label="Orders" value="22" delta={12.5} versus="vs previous 30 days" loading bodyHeight={84}>
        <p>the plot</p>
      </StatTile>,
    )
    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.queryByText('22')).not.toBeInTheDocument()
    expect(screen.queryByText('+12.5%')).not.toBeInTheDocument()
    expect(screen.queryByText('the plot')).not.toBeInTheDocument()
    expect(container.querySelectorAll('div[aria-hidden="true"] > span')).toHaveLength(3)
  })
})

describe('SegmentedControl', () => {
  it('can be switched off while the data it filters is on its way', () => {
    render(<SegmentedControl label="Period" value="a" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} onChange={vi.fn()} disabled />)
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  })

  const options = [
    { value: 'all', label: 'All', count: 5 },
    { value: 'new', label: 'New', count: 2 },
  ]

  it('marks the chosen option and reports a click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SegmentedControl label="Status" value="all" options={options} onChange={onChange} />)

    const group = screen.getByRole('group', { name: 'Status' })
    expect(within(group).getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: /New/ })).toHaveAttribute('aria-pressed', 'false')
    expect(within(group).getByRole('button', { name: /New/ })).toHaveTextContent('2')

    await user.click(within(group).getByRole('button', { name: /New/ }))
    expect(onChange).toHaveBeenCalledWith('new')
  })
})

describe('Avatar', () => {
  it('shows initials but keeps them from screen readers', () => {
    render(<Avatar name="Maria Angelica Santos" />)
    expect(screen.getByText('MS')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('BarList', () => {
  it('sizes every bar against the biggest row', () => {
    render(<BarList rows={[{ label: 'Cebu', value: 4 }, { label: 'Bohol', value: 1 }]} />)
    const bars = document.querySelectorAll<HTMLElement>('li > span[aria-hidden] > span')
    expect([...bars].map((bar) => bar.style.width)).toEqual(['100%', '25%'])
    expect(screen.getByText('Cebu').nextElementSibling).toHaveTextContent('4')
  })

  it('does not divide by zero when every row is zero', () => {
    render(<BarList rows={[{ label: 'Cebu', value: 0 }]} />)
    expect(document.querySelector<HTMLElement>('li > span[aria-hidden] > span')?.style.width).toBe('0%')
  })
})

describe('MiniBars and Sparkline', () => {
  const points = [
    { label: 'Oct 11', value: 0 },
    { label: 'Oct 12', value: 2 },
    { label: 'Oct 13', value: 4 },
  ]

  it('draw bars that grow from the baseline and name their value on hover', () => {
    render(<MiniBars points={points} caption="Orders" />)
    const bars = document.querySelectorAll<HTMLElement>('span[title]')
    expect([...bars].map((bar) => bar.getAttribute('title'))).toEqual(['Oct 11: 0', 'Oct 12: 2', 'Oct 13: 4'])
    expect([...bars].map((bar) => bar.style.height)).toEqual(['0%', '50%', '100%'])
  })

  it.each([
    ['MiniBars', <MiniBars key="a" points={points} caption="Orders" />],
    ['Sparkline', <Sparkline key="b" points={points} caption="Orders" />],
  ])('%s keeps every value in a table for screen readers', (_, plot) => {
    render(plot)
    const table = screen.getByRole('table', { name: 'Orders' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByRole('row', { name: /Oct 13/ })).toHaveTextContent('4')
  })

  it('hides that table through a box around it, since a table alone ignores overflow and stretches the page', () => {
    render(<Sparkline points={points} caption="Orders" />)
    const table = screen.getByRole('table', { name: 'Orders' })
    expect(table.parentElement?.tagName).toBe('DIV')
    expect(table).not.toHaveAttribute('class')
  })

  it('marks the latest value of the trend', () => {
    render(<Sparkline points={points} caption="Revenue" format={(value) => `P${value}`} />)
    expect(document.querySelector('span[title]')).toHaveAttribute('title', 'Oct 13: P4')
  })

  it('copes with a single point and with no points', () => {
    const { unmount } = render(<Sparkline points={[{ label: 'Oct 13', value: 3 }]} caption="Revenue" />)
    expect(screen.getByRole('table', { name: 'Revenue' })).toBeInTheDocument()
    unmount()
    render(<Sparkline points={[]} caption="Revenue" />)
    expect(document.querySelector('span[title]')).toBeNull()
  })
})
