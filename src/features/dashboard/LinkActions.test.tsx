import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { COPY_GAP_MS, COPY_RESET_MS } from '@/shared/hooks/useCopyToClipboard'
import { LinkActions } from './LinkActions'

const text = dashboardCopy.share.link
const url = 'https://menu.test/m/kape-kanto'
let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>

beforeEach(() => {
  vi.useFakeTimers()
  writeText = vi.fn(() => Promise.resolve())
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})
afterEach(() => vi.useRealTimers())

const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
const status = () => screen.getByRole('status')

function setup(props: Partial<Parameters<typeof LinkActions>[0]> = {}) {
  const view = render(<LinkActions url={url} {...props} />, { wrapper: MemoryRouter })
  // No user-event: with fake timers its wrapper waits for a timer that never fires.
  const press = () =>
    act(async () => {
      fireEvent.click(screen.getByRole('button', { name: text.copy }))
    })
  return { view, press }
}

describe('LinkActions', () => {
  it('has an Open link to the owner preview (demo mode) and a status line that is in the page while it is empty', () => {
    setup()
    // A new tab at the public address would have none of this tab's data, so the preview opens in the same tab.
    const open = screen.getByRole('link', { name: text.open })
    expect(open).toHaveAttribute('href', '/dashboard/preview')
    expect(open).not.toHaveAttribute('target')
    expect(screen.queryByText(text.newTab)).not.toBeInTheDocument()
    expect(status()).toBeEmptyDOMElement()
  })

  it('announces a copy, then announces the next press again', async () => {
    const { press } = setup()
    await press()
    await wait(COPY_GAP_MS)
    expect(status()).toHaveTextContent(text.copied)
    // The line is emptied before it answers again: a live region speaks a change, not the same text twice.
    await press()
    expect(status()).toBeEmptyDOMElement()
    await wait(COPY_GAP_MS)
    expect(status()).toHaveTextContent(text.copied)
  })

  it('says a refusal in the same status line, in the error look, and clears it after a while', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    const { press } = setup()
    await press()
    await wait(COPY_GAP_MS)
    expect(status()).toHaveTextContent(text.copyFailed)
    expect(status()).toHaveAttribute('data-state', 'error')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await wait(COPY_RESET_MS)
    expect(status()).toBeEmptyDOMElement()
  })

  it('shows the note while there is no copy answer, and calls onCopy on a press', async () => {
    const onCopy = vi.fn()
    const { press } = setup({ note: 'Link changed.', onCopy })
    expect(status()).toHaveTextContent('Link changed.')
    await press()
    expect(onCopy).toHaveBeenCalledOnce()
    await wait(COPY_GAP_MS)
    expect(status()).toHaveTextContent(text.copied)
  })

  it('makes Copy the main button when asked, and lets the page add buttons to the row', () => {
    setup({ copyVariant: 'primary', children: <button type="button">More</button> })
    expect(screen.getByRole('button', { name: text.copy }).className).toContain('primary')
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
  })

  it('drops the copy answer when the link changes', async () => {
    const { press, view } = setup()
    await press()
    await wait(COPY_GAP_MS)
    expect(status()).toHaveTextContent(text.copied)
    view.rerender(<LinkActions url="https://menu.test/m/other" />)
    expect(status()).toBeEmptyDOMElement()
  })
})
