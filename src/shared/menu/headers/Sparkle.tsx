/** A four-point sparkle star, drawn by us. Decoration only: hidden from screen readers, never focused. Its color comes from CSS (`fill`). */
export function Sparkle({ className }: { className?: string | undefined }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 0C12.9 7.2 16.8 11.1 24 12C16.8 12.9 12.9 16.8 12 24C11.1 16.8 7.2 12.9 0 12C7.2 11.1 11.1 7.2 12 0Z" />
    </svg>
  )
}
