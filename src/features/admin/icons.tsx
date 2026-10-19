import type { ReactNode } from 'react'

type Props = { size?: number }

function Icon({ size = 22, children }: Props & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconOverview(props: Props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </Icon>
  )
}

export function IconOrders(props: Props) {
  return (
    <Icon {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </Icon>
  )
}

export function IconCustomers(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.4 2.9-5 5.5-5s4.9 1.6 5.5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.5 14.2c2.3.2 3.7 1.6 4.2 4.3" />
    </Icon>
  )
}

export function IconPricing(props: Props) {
  return (
    <Icon {...props}>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <circle cx="8" cy="8" r="1.6" />
    </Icon>
  )
}

export function IconPhone(props: Props) {
  return (
    <Icon {...props}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </Icon>
  )
}

export function IconBack(props: Props) {
  return (
    <Icon {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  )
}

export function IconForward(props: Props) {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  )
}

export function IconTrend({ down = false, ...props }: Props & { down?: boolean }) {
  return (
    <Icon {...props}>
      <path d={down ? 'M12 5v14M6 13l6 6 6-6' : 'M12 19V5M6 11l6-6 6 6'} />
    </Icon>
  )
}
