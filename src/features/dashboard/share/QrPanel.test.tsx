import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderDashboardPage } from '@/test/dashboard'
import { qrMatrix, qrPath } from './qr/qrMatrix'
import { SharePage } from './SharePage'

const url = `${window.location.origin}/m/kape-kanto`
const originals = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }

type Click = { download: string; href: string }

function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

/** jsdom has neither blob addresses nor downloads: record what the page asks for. */
function recordDownloads() {
  const blobs: Blob[] = []
  const clicks: Click[] = []
  URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
    blobs.push(blob as Blob)
    return `blob:fake-${blobs.length}`
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicks.push({ download: this.download, href: this.href })
  })
  return { blobs, clicks }
}

function fakeCanvas(blob: Blob | null) {
  const painted: string[] = []
  const drawing = {
    fillStyle: '',
    fillRect() {
      painted.push(this.fillStyle)
    },
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => drawing) as unknown as HTMLCanvasElement['getContext'])
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) => done(blob))
  return painted
}

beforeEach(() => vi.useRealTimers())
afterEach(() => {
  vi.restoreAllMocks()
  URL.createObjectURL = originals.create
  URL.revokeObjectURL = originals.revoke
})

const render = () => renderDashboardPage(<SharePage />, '/dashboard/share')

describe('QR panel', () => {
  it('draws the code of the menu link as SVG elements, with a name for screen readers', async () => {
    await render()
    const picture = screen.getByRole('img', { name: `QR code of ${url}` })
    expect(picture.tagName.toLowerCase()).toBe('svg')
    const matrix = qrMatrix(url)!
    expect(picture.querySelector('path')).toHaveAttribute('d', qrPath(matrix))
    // A white tile under the dark modules, whatever the theme.
    expect(picture.querySelector('rect')).toHaveAttribute('fill', '#ffffff')
    expect(picture.querySelector('path')).toHaveAttribute('fill', '#000000')
    expect(picture.getAttribute('viewBox')).toBe(`0 0 ${matrix.length + 8} ${matrix.length + 8}`)
  })

  it('downloads the SVG file under the name of the link and frees its address later', async () => {
    const { blobs, clicks } = recordDownloads()
    const { user } = await render()
    await user.click(screen.getByRole('button', { name: 'Download SVG' }))
    expect(clicks).toEqual([{ download: 'kape-kanto-qr.svg', href: 'blob:fake-1' }])
    expect(blobs[0]?.type).toBe('image/svg+xml')
    const svg = await readText(blobs[0]!)
    expect(svg).toContain(`d="${qrPath(qrMatrix(url)!)}"`)
    expect(await screen.findByText('Your QR code is downloading.')).toBeInTheDocument()
    await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-1'), { timeout: 3000 })
  })

  it('downloads the PNG drawn on a canvas', async () => {
    const { blobs, clicks } = recordDownloads()
    const painted = fakeCanvas(new Blob(['png'], { type: 'image/png' }))
    const { user } = await render()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(await screen.findByText('Your QR code is downloading.')).toBeInTheDocument()
    expect(clicks).toEqual([{ download: 'kape-kanto-qr.png', href: 'blob:fake-1' }])
    expect(blobs[0]?.type).toBe('image/png')
    expect(painted[0]).toBe('#ffffff')
    expect(painted).toContain('#000000')
  })

  it('says it again for a second download, so a screen reader hears every press', async () => {
    recordDownloads()
    fakeCanvas(new Blob(['png'], { type: 'image/png' }))
    const { user } = await render()
    await user.click(screen.getByRole('button', { name: 'Download SVG' }))
    const status = await screen.findByText('Your QR code is downloading.')
    expect(status).toHaveAttribute('role', 'status')

    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    // The live region is emptied first and written again after a pause: the same words twice in a row are not read.
    expect(status).toBeEmptyDOMElement()
    await vi.waitFor(() => expect(status).toHaveTextContent('Your QR code is downloading.'))
  })

  it('says it could not make the PNG when the canvas gives nothing', async () => {
    const { clicks } = recordDownloads()
    fakeCanvas(null)
    const { user } = await render()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not make the picture')
    expect(clicks).toEqual([])
  })

  it('says it could not make the PNG when the browser has no canvas', async () => {
    recordDownloads()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => null) as unknown as HTMLCanvasElement['getContext'])
    const { user } = await render()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not make the picture')
  })
})
