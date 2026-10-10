import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (p: IconProps): IconProps => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p
})

export const CopyIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </svg>
)

export const SaveIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base(p)}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
  </svg>
)

export const PinIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base(p)}>
    <path d="M12 17v5" />
    <path d="M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6Z" />
  </svg>
)

export const TrashIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base(p)}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
    <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
  </svg>
)

export const MoreIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

export const CheckIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base({ strokeWidth: 3, ...p })}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)
