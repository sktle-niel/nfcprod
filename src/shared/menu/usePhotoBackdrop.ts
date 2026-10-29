import { useCallback, useState, type RefCallback } from 'react'
import { styleTheme } from '@/entities/theme/styles'
import { MODES, STYLE_IDS, type BackdropKind, type Theme } from '@/entities/theme/theme'
import { isOneOf } from '@/shared/lib/checks'
import { usePictureSize } from './photo/usePictureSize'

/** How far a page photo may be drawn wider than it is (half again) before a screen counts as too wide for it. */
export const PHOTO_UPSCALE_MAX = 1.5

/** The texture a menu shows instead of its photo: the one of the style the look started from (plain for Classic). */
export function photoFallback(theme: Theme): BackdropKind {
  const style = isOneOf(STYLE_IDS, theme.style) ? theme.style : 'classic'
  const mode = isOneOf(MODES, theme.mode) ? theme.mode : 'light'
  return styleTheme(style, mode).backdrop
}

/** Whether a photo `width` pixels wide may cover a screen `screen` pixels wide. A size that is not known yet counts as yes. */
export function photoFits(screen: number | null, width: number | null): boolean {
  if (screen === null || width === null || !(screen > 0) || !(width > 0)) return true
  return screen <= width * PHOTO_UPSCALE_MAX
}

type PhotoBackdrop = {
  /** The theme as the menu paints it: `theme` itself, or with the texture of its style in place of a photo the screen is too wide for. */
  theme: Theme
  /** Whether the menu draws the photo layer: the theme asks for a photo and has one. It stays while the texture stands in, to keep measuring. */
  layer: boolean
  /** Goes on the photo layer, whose width is the screen's. */
  layerRef: RefCallback<HTMLElement>
}

/**
 * The page photo against the screen it is shown on. The layer that draws it is as wide as the screen (the page, or the preview
 * frame); when that is wider than the photo can fill without looking stretched (PHOTO_UPSCALE_MAX), the menu paints the
 * texture of its style instead, and the photo comes back when the screen narrows (a turned tablet). Until the photo's size
 * and the screen's width are known, the photo stands.
 */
export function usePhotoBackdrop(theme: Theme): PhotoBackdrop {
  const src = theme.backdrop === 'picture' ? theme.backdropPicture : null
  const size = usePictureSize(src)
  const [screen, setScreen] = useState<number | null>(null)

  // Measured from the layer as it mounts, and watched while it stays: the cleanup React 19 runs when the layer goes.
  const layerRef = useCallback((node: HTMLElement | null) => {
    if (node === null) return undefined
    if (typeof ResizeObserver === 'undefined') {
      setScreen(node.getBoundingClientRect().width)
      return undefined
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width !== undefined) setScreen(width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const layer = src !== null
  const painted = layer && !photoFits(screen, size?.width ?? null) ? { ...theme, backdrop: photoFallback(theme), backdropPicture: null } : theme
  return { theme: painted, layer, layerRef }
}
