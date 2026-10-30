import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimeAt } from './useTimeAt'

const DAY = 86_400_000
const START = Date.parse('2026-10-19T02:00:00Z')
// The longest wait one timer holds (2^31 - 1 ms): a moment further off is reached in steps of this size.
const LONGEST_TIMER = 2_147_483_647

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})
afterEach(() => vi.useRealTimers())

/** Mounts the hook for `at` and counts how often the component that holds it renders. */
function mount(at: number | null) {
  let renders = 0
  const hook = renderHook(
    (props: { at: number | null }) => {
      renders += 1
      useTimeAt(props.at)
    },
    { initialProps: { at } },
  )
  return { hook, renders: () => renders }
}

describe('useTimeAt', () => {
  it('renders again once the moment passes, and not before', () => {
    const { renders } = mount(START + 1000)
    act(() => vi.advanceTimersByTime(999))
    expect(renders()).toBe(1)
    act(() => vi.advanceTimersByTime(1))
    expect(renders()).toBe(2)
  })

  it('never renders again for null, which waits for nothing', () => {
    const { renders } = mount(null)
    act(() => vi.advanceTimersByTime(1000 * DAY))
    expect(renders()).toBe(1)
  })

  it('waits for a new moment and drops the old timer when the moment changes', () => {
    const { hook, renders } = mount(START + 1000)
    hook.rerender({ at: START + 5000 })
    const rendered = renders()
    act(() => vi.advanceTimersByTime(1000))
    expect(renders()).toBe(rendered)
    act(() => vi.advanceTimersByTime(4000))
    expect(renders()).toBe(rendered + 1)
  })

  it('clears its timer on unmount, so nothing renders after the page is gone', () => {
    const { hook, renders } = mount(START + 1000)
    expect(vi.getTimerCount()).toBe(1)
    hook.unmount()
    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.advanceTimersByTime(DAY))
    expect(renders()).toBe(1)
  })

  it('waits for nothing when the moment has already passed', () => {
    const { renders } = mount(START - 1)
    expect(vi.getTimerCount()).toBe(0)
    act(() => vi.advanceTimersByTime(DAY))
    expect(renders()).toBe(1)
  })

  it('waits in steps for a moment further off than one timer holds, and renders only when it comes', () => {
    const { renders } = mount(START + 40 * DAY)
    act(() => vi.advanceTimersByTime(LONGEST_TIMER - 1))
    expect(renders()).toBe(1)
    act(() => vi.advanceTimersByTime(1))
    expect(renders()).toBe(2)
    act(() => vi.advanceTimersByTime(40 * DAY - LONGEST_TIMER - 1))
    expect(renders()).toBe(2)
    act(() => vi.advanceTimersByTime(1))
    expect(renders()).toBe(3)
  })
})
