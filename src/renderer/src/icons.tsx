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

export const DraggedIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base(p)}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </svg>
)

export const CheckIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base({ strokeWidth: 3, ...p })}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

/** A small bird sitting on a branch. */
export const BirdMark = (p: IconProps): React.JSX.Element => (
  <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden {...p}>
    <path d="M2.5 19.5h19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".55" />
    <path
      fill="currentColor"
      d="M5.2 16.8c.6-4.6 3.9-8 8.3-8 1.2 0 2.2.3 3 .8l3.7-.5-2.3 2.1c.2.6.3 1.2.3 1.8 0 2.1-1.4 3.8-3.5 3.8H5.2Z"
    />
    <path d="M10.5 16.8v2.2M13.5 16.8v2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="15.6" cy="10.9" r="0.95" fill="var(--panel)" />
  </svg>
)
