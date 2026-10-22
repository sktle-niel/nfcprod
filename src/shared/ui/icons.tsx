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

export function IconMenu(props: Props) {
  return (
    <Icon {...props}>
      <path d="M7 3v8a2 2 0 0 0 2 2M11 3v8a2 2 0 0 1-2 2M9 3v18" />
      <path d="M17 21V3c-2.2 1.5-3 4-3 7v3h3" />
    </Icon>
  )
}

export function IconDesign(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.2-.9-1.6-.9-2.7 0-1 .8-1.7 1.9-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1.1" />
      <circle cx="10" cy="7" r="1.1" />
      <circle cx="14.5" cy="7" r="1.1" />
    </Icon>
  )
}

export function IconShare(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
    </Icon>
  )
}

export function IconAccount(props: Props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Icon>
  )
}

export function IconPlus(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function IconEdit(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </Icon>
  )
}

export function IconTrash(props: Props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Icon>
  )
}

export function IconArrowUp(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Icon>
  )
}

export function IconArrowDown(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Icon>
  )
}

export function IconCheck(props: Props) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  )
}

export function IconCopy(props: Props) {
  return (
    <Icon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </Icon>
  )
}

export function IconDownload(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
    </Icon>
  )
}

export function IconExternal(props: Props) {
  return (
    <Icon {...props}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </Icon>
  )
}

export function IconImage(props: Props) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 8" />
    </Icon>
  )
}

export function IconWarning(props: Props) {
  return (
    <Icon {...props}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </Icon>
  )
}

export function IconLogOut(props: Props) {
  return (
    <Icon {...props}>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </Icon>
  )
}
