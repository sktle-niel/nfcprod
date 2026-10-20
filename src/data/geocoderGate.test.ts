import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { abortError, createGate, type Gate } from './geocoderGate'

const GAP = 1100

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 })
})

afterEach(() => {
  vi.useRealTimers()
})

/** Asks for a turn and writes down when it came. */
function ask(gate: Gate, log: Record<string, number>, name: string, signal?: AbortSignal) {
  const turn = gate.turn(signal).then(() => {
    log[name] = Date.now() - 1_000_000
  })
  return turn
}

describe('createGate', () => {
  it('gives the first turn at once', async () => {
    const log: Record<string, number> = {}
    void ask(createGate(GAP), log, 'a')
    await vi.advanceTimersByTimeAsync(0)
    expect(log).toEqual({ a: 0 })
  })

  it('makes the next one wait until the gap has passed since the last start', async () => {
    const gate = createGate(GAP)
    const log: Record<string, number> = {}
    void ask(gate, log, 'a')
    void ask(gate, log, 'b')
    await vi.advanceTimersByTimeAsync(GAP - 1)
    expect(log).toEqual({ a: 0 })
    await vi.advanceTimersByTimeAsync(1)
    expect(log).toEqual({ a: 0, b: GAP })
  })

  it('spaces many callers one gap apart, first come first served', async () => {
    const gate = createGate(GAP)
    const log: Record<string, number> = {}
    for (const name of ['a', 'b', 'c', 'd']) void ask(gate, log, name)
    await vi.advanceTimersByTimeAsync(GAP * 4)
    expect(log).toEqual({ a: 0, b: GAP, c: GAP * 2, d: GAP * 3 })
  })

  it('counts the gap from the start of the last one, not from when anyone finished', async () => {
    const gate = createGate(GAP)
    const log: Record<string, number> = {}
    void ask(gate, log, 'a')
    await vi.advanceTimersByTimeAsync(400)
    void ask(gate, log, 'b')
    await vi.advanceTimersByTimeAsync(GAP)
    expect(log).toEqual({ a: 0, b: GAP })
  })

  it('gives a turn at once when the gap has long passed', async () => {
    const gate = createGate(GAP)
    const log: Record<string, number> = {}
    void ask(gate, log, 'a')
    await vi.advanceTimersByTimeAsync(10_000)
    void ask(gate, log, 'b')
    await vi.advanceTimersByTimeAsync(0)
    expect(log).toEqual({ a: 0, b: 10_000 })
  })

  it('does not keep a timer when nobody is waiting', async () => {
    const gate = createGate(GAP)
    void gate.turn()
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)
    void gate.turn()
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(GAP)
    expect(vi.getTimerCount()).toBe(0)
  })

  describe('when a caller gives up', () => {
    it('rejects it, and never gives it a turn', async () => {
      const gate = createGate(GAP)
      const log: Record<string, number> = {}
      void ask(gate, log, 'a')
      const controller = new AbortController()
      const b = ask(gate, log, 'b', controller.signal)
      const rejected = expect(b).rejects.toMatchObject({ name: 'AbortError' })
      controller.abort()
      await rejected
      await vi.advanceTimersByTimeAsync(GAP * 3)
      expect(log).toEqual({ a: 0 })
    })

    it('closes the line up behind it, so the next caller does not wait for a turn that is not used', async () => {
      const gate = createGate(GAP)
      const log: Record<string, number> = {}
      void ask(gate, log, 'a')
      const controller = new AbortController()
      const b = ask(gate, log, 'b', controller.signal)
      void b.catch(() => {})
      void ask(gate, log, 'c')
      controller.abort()
      await vi.advanceTimersByTimeAsync(GAP)
      expect(log).toEqual({ a: 0, c: GAP })
    })

    it('leaves nothing behind when the last one in line gives up', async () => {
      const gate = createGate(GAP)
      void gate.turn()
      const controller = new AbortController()
      const waiting = gate.turn(controller.signal)
      const rejected = expect(waiting).rejects.toBeDefined()
      controller.abort()
      await rejected
      expect(vi.getTimerCount()).toBe(0)
    })

    it('rejects at once for a signal that is already aborted, and takes no place in line', async () => {
      const gate = createGate(GAP)
      const log: Record<string, number> = {}
      void ask(gate, log, 'a')
      const controller = new AbortController()
      controller.abort()
      await expect(gate.turn(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
      void ask(gate, log, 'b')
      await vi.advanceTimersByTimeAsync(GAP)
      expect(log).toEqual({ a: 0, b: GAP })
    })

    it('does nothing when it gives up after it already had its turn', async () => {
      const gate = createGate(GAP)
      const log: Record<string, number> = {}
      const controller = new AbortController()
      void ask(gate, log, 'a', controller.signal)
      await vi.advanceTimersByTimeAsync(0)
      void ask(gate, log, 'b')
      controller.abort()
      await vi.advanceTimersByTimeAsync(GAP)
      expect(log).toEqual({ a: 0, b: GAP })
    })

    it('does not keep a listener on a signal after the turn came', async () => {
      const gate = createGate(GAP)
      const signal = new AbortController().signal
      const remove = vi.spyOn(signal, 'removeEventListener')
      await gate.turn(signal)
      expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    })

    it('can have several callers give up in any order', async () => {
      const gate = createGate(GAP)
      const log: Record<string, number> = {}
      void ask(gate, log, 'a')
      const first = new AbortController()
      const second = new AbortController()
      const third = new AbortController()
      for (const [name, controller] of [['b', first], ['c', second], ['d', third]] as const) {
        void ask(gate, log, name, controller.signal).catch(() => {})
      }
      void ask(gate, log, 'e')
      second.abort()
      first.abort()
      await vi.advanceTimersByTimeAsync(GAP * 2)
      expect(log).toEqual({ a: 0, d: GAP, e: GAP * 2 })
    })
  })

  it('does not stall when the clock jumps back', async () => {
    const gate = createGate(GAP)
    const log: Record<string, number> = {}
    void ask(gate, log, 'a')
    await vi.advanceTimersByTimeAsync(0)
    vi.setSystemTime(Date.now() - 3_600_000)
    void ask(gate, log, 'b')
    await vi.advanceTimersByTimeAsync(GAP)
    expect(Object.keys(log)).toEqual(['a', 'b'])
  })

  it('lets everyone through at once with a gap of zero', async () => {
    const gate = createGate(0)
    const log: Record<string, number> = {}
    for (const name of ['a', 'b', 'c']) void ask(gate, log, name)
    await vi.advanceTimersByTimeAsync(0)
    expect(log).toEqual({ a: 0, b: 0, c: 0 })
  })
})

describe('abortError', () => {
  it('is the reason the signal was aborted with, when that is an error', () => {
    const controller = new AbortController()
    const reason = new Error('stale')
    controller.abort(reason)
    expect(abortError(controller.signal)).toBe(reason)
  })

  it('is an AbortError when the reason is the usual one or is not an error', () => {
    const plain = new AbortController()
    plain.abort()
    expect(abortError(plain.signal)).toMatchObject({ name: 'AbortError' })

    const text = new AbortController()
    text.abort('because')
    expect(abortError(text.signal)).toMatchObject({ name: 'AbortError' })
  })
})
