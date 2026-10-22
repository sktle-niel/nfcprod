import type { ComponentType } from 'react'
import type { CardKind } from '@/entities/theme/theme'
import { BadgeCard } from './BadgeCard'
import { LeaderCard } from './LeaderCard'
import { OutlineCard } from './OutlineCard'
import { PlateCard } from './PlateCard'
import { PosterCard } from './PosterCard'
import { RowCard } from './RowCard'
import { SoftCard } from './SoftCard'
import { TileCard } from './TileCard'
import type { CardProps } from './types'

/** Every kind of card, by the name the theme gives it. One file each: a kind is changed or added without touching the others. */
export const CARD_COMPONENTS: Record<CardKind, ComponentType<CardProps>> = {
  row: RowCard,
  leader: LeaderCard,
  tile: TileCard,
  badge: BadgeCard,
  outline: OutlineCard,
  soft: SoftCard,
  plate: PlateCard,
  poster: PosterCard,
}
