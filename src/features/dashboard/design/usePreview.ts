import { useMemo, useState } from 'react'
import type { Business } from '@/entities/business/business'
import type { MenuViewBusiness } from '@/shared/menu/MenuView'
import { previewOf, wholeColors, type Draft, type KeptColors } from './draft'

function colorsOf(draft: Draft, saved: Business): KeptColors {
  const { primary, secondary, background, surface } = saved.theme
  return wholeColors(draft.theme, { primary, secondary, background, surface })
}

/**
 * The draft as the preview draws it, with the business types so a product without a picture gets a fitting drawing. A
 * color that is half typed keeps the last whole color of the draft, not the saved one: after a switch to Dark the saved
 * dark-on-light text would otherwise be drawn on the new dark page for every keystroke.
 */
export function usePreview(draft: Draft, saved: Business): MenuViewBusiness {
  const [kept, setKept] = useState(() => colorsOf(draft, saved))
  const whole = wholeColors(draft.theme, kept)
  // Remembered while rendering, the documented way to keep a value that follows another one: React draws again at once.
  if (
    whole.primary !== kept.primary ||
    whole.secondary !== kept.secondary ||
    whole.background !== kept.background ||
    whole.surface !== kept.surface
  ) {
    setKept(whole)
  }
  const { primary, secondary, background, surface } = whole
  return useMemo(
    () => previewOf(draft, saved, { primary, secondary, background, surface }),
    [draft, saved, primary, secondary, background, surface],
  )
}
