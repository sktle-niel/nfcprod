import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DemoTag } from './DemoTag'
import { LoadError } from './LoadError'

describe('LoadError', () => {
  it('announces the message as an alert and offers a retry', async () => {
    const onRetry = vi.fn()
    render(<LoadError message="Could not load orders." retryLabel="Retry" onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load orders.')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('moves the focus to the title of the part it is given before it retries, because Retry is about to go', async () => {
    function Page() {
      const page = useRef<HTMLDivElement>(null)
      const [failed, setFailed] = useState(true)
      return (
        <div ref={page}>
          <h1>Orders</h1>
          {failed && <LoadError message="Could not load orders." retryLabel="Retry" onRetry={() => setFailed(false)} focusTitleIn={page} />}
        </div>
      )
    }
    render(<Page />)
    screen.getByRole('button', { name: 'Retry' }).focus()
    await userEvent.keyboard('{Enter}')

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Orders' })).toHaveFocus()
  })

  it('keeps Retry, busy and without the message, while busy, and ignores a press', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(<LoadError message="Could not load orders." retryLabel="Retry" onRetry={onRetry} busy />)
    const retry = screen.getByRole('button', { name: 'Retry' })
    expect(retry).toHaveAttribute('aria-busy', 'true')
    expect(retry).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Could not load orders.')
    await userEvent.click(retry)
    expect(onRetry).not.toHaveBeenCalled()

    rerender(<LoadError message="Could not load orders." retryLabel="Retry" onRetry={onRetry} />)
    // The same button, so the focus it holds stays.
    expect(screen.getByRole('button', { name: 'Retry' })).toBe(retry)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load orders.')
  })
})

describe('DemoTag', () => {
  it('shows what it is given', () => {
    render(<DemoTag>Sample data</DemoTag>)
    expect(screen.getByText('Sample data')).toBeInTheDocument()
  })
})
