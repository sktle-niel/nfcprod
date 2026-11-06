import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReadingSection } from './useReadingSection'

function Probe({ ids, enabled = true }: { ids: string[]; enabled?: boolean }) {
  const active = useReadingSection(ids, enabled)
  return (
    <>
      <output>{active}</output>
      {ids.map((id) => (
        <section key={id} id={id} />
      ))}
    </>
  )
}

/** Gives the sections their place on a screen 1000 tall (the line is at 350). */
function place(boxes: Record<string, [top: number, bottom: number]>) {
  for (const [id, [top, bottom]] of Object.entries(boxes)) {
    vi.spyOn(document.getElementById(id) as HTMLElement, 'getBoundingClientRect').mockReturnValue({ top, bottom, height: bottom - top } as DOMRect)
  }
}

const scroll = async () => {
  await act(async () => {
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(resolve))
  })
}
const shown = () => screen.getByRole('status').textContent

beforeEach(() => {
  vi.stubGlobal('innerHeight', 1000)
  vi.stubGlobal('scrollY', 100)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useReadingSection', () => {
  it('stays on the first while there is no layout', async () => {
    render(<Probe ids={['a', 'b']} />)
    await scroll()
    expect(shown()).toBe('0')
  })

  it('moves to the section that holds the reading line, and back after a jump', async () => {
    render(<Probe ids={['a', 'b', 'c']} />)
    place({ a: [-500, -100], b: [-100, 400], c: [400, 2000] })
    await scroll()
    expect(shown()).toBe('1')
    place({ a: [100, 500], b: [500, 900], c: [900, 2000] })
    await scroll()
    expect(shown()).toBe('0')
  })

  it('reads the left column first in two columns, where a later section starts higher', async () => {
    render(<Probe ids={['a', 'b', 'c']} />)
    place({ a: [100, 500], b: [500, 900], c: [100, 900] })
    await scroll()
    expect(shown()).toBe('0')
    place({ a: [-400, 0], b: [0, 400], c: [-400, 400] })
    await scroll()
    expect(shown()).toBe('1')
  })

  it('lands on the last at the end of the page', async () => {
    render(<Probe ids={['a', 'b']} />)
    place({ a: [100, 800], b: [800, 900] })
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(1100)
    await scroll()
    expect(shown()).toBe('1')
  })

  it('does nothing when turned off', async () => {
    render(<Probe ids={['a', 'b']} enabled={false} />)
    place({ a: [-900, -500], b: [-500, 900] })
    await scroll()
    expect(shown()).toBe('0')
  })
})
