import { cards } from '../landing.data'

type Props = {
  card: keyof typeof cards
  className?: string | undefined
  eager?: boolean | undefined
}

// One place for card images so size attributes, alt text and loading stay consistent.
export function CardImage({ card, className, eager = false }: Props) {
  const c = cards[card]
  return (
    <img
      className={className}
      src={c.src}
      width={c.width}
      height={c.height}
      alt={`${c.label} NFC card`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  )
}
