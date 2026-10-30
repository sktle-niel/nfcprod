import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { STOCK_PHOTOS } from '@/entities/theme/stockPhotos'
import { styleTheme } from '@/entities/theme/styles'
import { DEFAULT_THEME, type Theme } from '@/entities/theme/theme'
import { sampleBusiness } from '@/test/ownerFixtures'
import { draftOf } from './draft'
import { useDesignDraft } from './useDesignDraft'
import { useLookActions } from './useLookActions'

const ID = STOCK_PHOTOS[0].id

/** The Design page's draft over the sample business, with the theme it starts from. */
function draftWith(theme: Theme) {
  const business = sampleBusiness({ theme })
  return renderHook(() => useDesignDraft(business, { saveBusiness: vi.fn(), uploadImage: vi.fn() }))
}

describe('the library photo in the look actions', () => {
  it('puts the photo on the page in one theme update, and leaves its strength, fit and position as they are', () => {
    const theme = vi.fn()
    const business = sampleBusiness()
    const { result } = renderHook(() => useLookActions({ draft: draftOf(business), business, busy: false, theme, setNote: vi.fn() }))
    act(() => result.current.chooseStock(ID))
    expect(theme).toHaveBeenCalledTimes(1)
    const update = theme.mock.calls[0]?.[0] as (current: Theme) => Theme
    const current: Theme = { ...DEFAULT_THEME, backdropVeil: 'strong', backdropFit: 'contain', backdropPosition: 'bottom' }
    expect(update(current)).toEqual({ ...current, backdrop: 'stock', backdropStock: ID })
  })

  it('is on the form of the Design page: the photo and the unsaved change show in the draft', () => {
    const { result } = draftWith({ ...DEFAULT_THEME, backdropVeil: 'strong' })
    expect(result.current.dirty).toBe(false)
    act(() => result.current.chooseStock(ID))
    expect(result.current.draft.theme).toMatchObject({ backdrop: 'stock', backdropStock: ID, backdropVeil: 'strong', backdropFit: 'cover', backdropPosition: 'center' })
    expect(result.current.dirty).toBe(true)
  })

  it('keeps the photo while a style is applied or reset: the style takes the texture, the photo waits', () => {
    const { result } = draftWith(DEFAULT_THEME)
    act(() => result.current.setChoice('backdropVeil', 'faint'))
    act(() => result.current.chooseStock(ID))
    act(() => result.current.applyStyle('roast'))
    expect(result.current.draft.theme).toEqual({ ...styleTheme('roast', 'light'), backdropStock: ID, backdropVeil: 'faint' })
    expect(result.current.draft.theme.backdrop).toBe('grain')
    act(() => result.current.applyStyle('noir'))
    expect(result.current.draft.theme).toMatchObject({ style: 'noir', backdrop: 'deco', backdropStock: ID, backdropVeil: 'faint' })
    act(() => result.current.resetStyle())
    expect(result.current.draft.theme).toMatchObject({ style: 'noir', backdrop: 'deco', backdropStock: ID, backdropVeil: 'faint' })
  })

  it('takes the photo away and puts the page back on the texture of the style the look started from', () => {
    const { result } = draftWith(styleTheme('roast', 'dark'))
    act(() => result.current.chooseStock(ID))
    expect(result.current.draft.theme.backdrop).toBe('stock')
    act(() => result.current.clearStock())
    expect(result.current.draft.theme).toEqual(styleTheme('roast', 'dark'))
    expect(result.current.dirty).toBe(false)
  })

  it('clears to plain for a look that started from Classic, and keeps the strength, fit and position', () => {
    const { result } = draftWith(DEFAULT_THEME)
    act(() => result.current.setChoice('backdropFit', 'stretch'))
    act(() => result.current.chooseStock(ID))
    act(() => result.current.clearStock())
    expect(result.current.draft.theme).toEqual({ ...DEFAULT_THEME, backdropFit: 'stretch' })
  })
})
