import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COPY_GAP_MS, COPY_RESET_MS, useCopyToClipboard } from './useCopyToClipboard'

let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>

beforeEach(() => {
  vi.useFakeTimers()
  writeText = vi.fn(() => Promise.resolve())
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
})
afterEach(() => vi.useRealTimers())

const press = (hook: { result: { current: { copy: () => Promise<void> } } }) =>
  act(async () => {
    await hook.result.current.copy()
  })
const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

describe('useCopyToClipboard', () => {
  it('is idle until the first press', () => {
    const hook = renderHook(() => useCopyToClipboard('https://a.test/m/x'))
    expect(hook.result.current.state).toBe('idle')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('copies the value and says so', async () => {
    const hook = renderHook(() => useCopyToClipboard('https://a.test/m/x'))
    await press(hook)
    await wait(COPY_GAP_MS)
    expect(writeText).toHaveBeenCalledWith('https://a.test/m/x')
    expect(hook.result.current.state).toBe('copied')
  })

  it('says it failed when the clipboard refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    const hook = renderHook(() => useCopyToClipboard('https://a.test/m/x'))
    await press(hook)
    await wait(COPY_GAP_MS)
    expect(hook.result.current.state).toBe('failed')
  })

  it('says it failed when there is no clipboard at all', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    const hook = renderHook(() => useCopyToClipboard('https://a.test/m/x'))
    await press(hook)
    await wait(COPY_GAP_MS)
    expect(hook.result.current.state).toBe('failed')
  })

  it('goes back to idle after a few seconds, so the message does not go stale', async () => {
    const hook = renderHook(() => useCopyToClipboard('https://a.test/m/x'))
    await press(hook)
    await wait(COPY_GAP_MS)
    await wait(COPY_RESET_MS - 1)
    expect(hook.result.current.state).toBe('copied')
    await wait(1)
    expect(hook.result.current.state).toBe('idle')
  })

  it('empties the answer on every press and sets it again, so a live region speaks each press', async () => {
    const hook = renderHook(() => useCopyToClipboard('https://a.test/m/x'))
    await press(hook)
    await wait(COPY_GAP_MS)
    expect(hook.result.current.state).toBe('copied')
    await press(hook)
    expect(hook.result.current.state).toBe('idle')
    await wait(COPY_GAP_MS)
    expect(hook.result.current.state).toBe('copied')
  })

  it('lets only the last of two quick presses answer', async () => {
    const hook = renderHook(() => useCopyToClipboard('https://a.test/m/x'))
    await press(hook)
    await press(hook)
    await wait(COPY_GAP_MS)
    expect(hook.result.current.state).toBe('copied')
    await wait(COPY_RESET_MS)
    expect(hook.result.current.state).toBe('idle')
  })

  it('drops the answer when the value changes', async () => {
    const hook = renderHook(({ value }) => useCopyToClipboard(value), { initialProps: { value: 'https://a.test/m/x' } })
    await press(hook)
    await wait(COPY_GAP_MS)
    hook.rerender({ value: 'https://a.test/m/y' })
    expect(hook.result.current.state).toBe('idle')
  })

  it('does not answer after the page is gone', async () => {
    const hook = renderHook(() => useCopyToClipboard('https://a.test/m/x'))
    await press(hook)
    hook.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
