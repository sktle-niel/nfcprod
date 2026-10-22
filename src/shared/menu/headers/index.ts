import type { ComponentType } from 'react'
import type { HeaderKind } from '@/entities/theme/theme'
import { AwningHeader } from './AwningHeader'
import { FrameHeader } from './FrameHeader'
import { PlainHeader } from './PlainHeader'
import { PosterHeader } from './PosterHeader'
import { ScriptHeader } from './ScriptHeader'
import type { HeaderProps } from './types'

/** Every kind of header, by the name the theme gives it. One file each. */
export const HEADER_COMPONENTS: Record<HeaderKind, ComponentType<HeaderProps>> = {
  plain: PlainHeader,
  awning: AwningHeader,
  poster: PosterHeader,
  script: ScriptHeader,
  frame: FrameHeader,
}
