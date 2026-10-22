import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FONTS, type Font } from '@/entities/theme/theme'
import { FACE_LOADERS, facesOf, PAIRING_FACES, resetLoadedFaces, useMenuFonts, type MenuFace } from './fonts'

// The five stylesheets are replaced by markers, so no font file is touched and each loader shows which package it imports.
vi.mock('@fontsource-variable/playfair-display/wght.css', () => ({ marker: 'playfair' }))
vi.mock('@fontsource-variable/fredoka/wght.css', () => ({ marker: 'fredoka' }))
vi.mock('@fontsource/dm-serif-display/latin-400.css', () => ({ marker: 'dmSerif' }))
vi.mock('@fontsource/anton/latin-400.css', () => ({ marker: 'anton' }))
vi.mock('@fontsource/pacifico/latin-400.css', () => ({ marker: 'pacifico' }))

type Look = Parameters<typeof useMenuFonts>[0]
const look = (font: Font, title: Look['title'] = 'plain', header: Look['header'] = 'plain'): Look => ({ font, title, header })
const FACES = Object.keys(FACE_LOADERS) as MenuFace[]

// Every loader is replaced by a counter that resolves, so the test sees exactly which faces a menu asks for.
let asked: MenuFace[]
let failing: Set<MenuFace>
const original = { ...FACE_LOADERS }

beforeEach(() => {
  asked = []
  failing = new Set()
  resetLoadedFaces()
  for (const face of FACES) {
    vi.spyOn(FACE_LOADERS, face).mockImplementation(() => {
      asked.push(face)
      return failing.has(face) ? Promise.reject(new Error('network down')) : Promise.resolve({})
    })
  }
})

async function draw(theme: Look) {
  const view = renderHook(() => useMenuFonts(theme))
  // The loaders start in a microtask after the effect; let them settle.
  await new Promise((resolve) => setTimeout(resolve, 0))
  return view
}

describe('the loaders', () => {
  it('import the stylesheet of their own package', async () => {
    for (const face of FACES) expect(await original[face]()).toEqual({ marker: face })
  })

  it('cover every pairing: each font has an entry and each face it names has a loader', () => {
    expect(Object.keys(PAIRING_FACES).sort()).toEqual([...FONTS].sort())
    for (const font of FONTS) {
      for (const face of PAIRING_FACES[font]) expect(typeof FACE_LOADERS[face]).toBe('function')
    }
  })

  it('give every lazy face to a pairing', () => {
    const used = new Set(FONTS.flatMap((font) => PAIRING_FACES[font]))
    expect([...used].sort()).toEqual([...FACES].sort())
  })
})

describe('which faces a theme needs', () => {
  it('needs no file for the fonts the app already carries', () => {
    for (const font of ['urbanist', 'instrumentSerif', 'system'] as const) expect(facesOf(look(font))).toEqual([])
  })

  it('maps each added pairing to its own face', () => {
    for (const face of FACES) expect(facesOf(look(face))).toEqual([face])
  })

  it('adds the script face for a script title or a script header, once', () => {
    expect(facesOf(look('urbanist', 'script'))).toEqual(['pacifico'])
    expect(facesOf(look('urbanist', 'plain', 'script'))).toEqual(['pacifico'])
    expect(facesOf(look('pacifico', 'script', 'script'))).toEqual(['pacifico'])
    expect(facesOf(look('anton', 'script'))).toEqual(['anton', 'pacifico'])
  })
})

describe('useMenuFonts', () => {
  it('loads exactly the faces of the pairing, once each', async () => {
    for (const face of FACES) {
      asked = []
      resetLoadedFaces()
      await draw(look(face))
      expect(asked).toEqual([face])
    }
  })

  it('loads the display face and the script face together', async () => {
    await draw(look('anton', 'script'))
    expect([...asked].sort()).toEqual(['anton', 'pacifico'])
  })

  it('requests nothing for the fonts the app already has', async () => {
    await draw(look('urbanist'))
    await draw(look('system'))
    await draw(look('instrumentSerif'))
    expect(asked).toEqual([])
  })

  it('loads nothing for a second menu with the same pairing, and only the new face for a different one', async () => {
    await draw(look('playfair'))
    expect(asked).toEqual(['playfair'])
    await draw(look('playfair'))
    expect(asked).toEqual(['playfair'])
    await draw(look('playfair', 'script'))
    expect(asked).toEqual(['playfair', 'pacifico'])
    await draw(look('anton', 'script', 'script'))
    expect(asked).toEqual(['playfair', 'pacifico', 'anton'])
  })

  it('does not load again when the same menu is drawn again', async () => {
    const view = await draw(look('fredoka'))
    view.rerender()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(asked).toEqual(['fredoka'])
  })

  it('asks once when two menus start in the same moment', async () => {
    renderHook(() => useMenuFonts(look('dmSerif')))
    renderHook(() => useMenuFonts(look('dmSerif')))
    await waitFor(() => expect(asked).toEqual(['dmSerif']))
  })

  it('does not throw when a font fails to load, and tries again for the next menu', async () => {
    failing.add('anton')
    await expect(draw(look('anton'))).resolves.toBeDefined()
    expect(asked).toEqual(['anton'])
    failing.clear()
    await draw(look('anton'))
    expect(asked).toEqual(['anton', 'anton'])
    await draw(look('anton'))
    expect(asked).toEqual(['anton', 'anton'])
  })

  it('does not throw when a loader throws at once', async () => {
    vi.spyOn(FACE_LOADERS, 'pacifico').mockImplementation(() => {
      throw new Error('bad module')
    })
    await expect(draw(look('pacifico'))).resolves.toBeDefined()
  })
})
