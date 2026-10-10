import type { CardIndex } from './layout'

/**
 * Three generated stand-ins for screenshots, in the palette of docs/screenshot.png.
 * Gradient ids are fixed: every instance of a thumbnail defines an identical gradient,
 * so duplicates in the DOM are harmless.
 */
const SVG = { viewBox: '0 0 320 200', preserveAspectRatio: 'xMidYMid slice', width: '100%', height: '100%', style: { display: 'block' } } as const

/** Pink-to-blue stage scene with a dark dancing figure. */
const Figure = (): React.JSX.Element => (
  <svg {...SVG}>
    <defs>
      <linearGradient id="th-fig-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff4fd0" />
        <stop offset="0.55" stopColor="#7a5cff" />
        <stop offset="1" stopColor="#2a8bff" />
      </linearGradient>
      <radialGradient id="th-fig-glow" cx="0.38" cy="0.32" r="0.55">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="200" fill="url(#th-fig-bg)" />
    <rect width="320" height="200" fill="url(#th-fig-glow)" />
    <path d="M118 118 C100 128 96 148 108 160" stroke="#ff3b5c" strokeWidth="8" strokeLinecap="round" fill="none" />
    <g fill="#140a2e">
      <circle cx="170" cy="62" r="13" />
      <path d="M150 80 C165 70 190 74 200 92 L222 150 L204 156 L188 112 L176 150 L196 186 L176 192 L150 158 L140 118 Z" />
      <path d="M150 84 L112 112 L120 124 L158 104 Z" />
    </g>
  </svg>
)

/** Soft teal-to-orange gradient. */
const Gradient = (): React.JSX.Element => (
  <svg {...SVG}>
    <defs>
      <linearGradient id="th-grad-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#86b9cc" />
        <stop offset="0.5" stopColor="#c58f86" />
        <stop offset="1" stopColor="#f26a2c" />
      </linearGradient>
      <radialGradient id="th-grad-light" cx="0.75" cy="0.7" r="0.6">
        <stop offset="0" stopColor="#ffb27a" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffb27a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="200" fill="url(#th-grad-bg)" />
    <rect width="320" height="200" fill="url(#th-grad-light)" />
  </svg>
)

/** Sunset behind layered mountains. */
const Mountains = (): React.JSX.Element => (
  <svg {...SVG}>
    <defs>
      <linearGradient id="th-mtn-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a4aa0" />
        <stop offset="0.55" stopColor="#d77aa0" />
        <stop offset="1" stopColor="#f7ad6e" />
      </linearGradient>
      <radialGradient id="th-mtn-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff2b8" stopOpacity="1" />
        <stop offset="1" stopColor="#fff2b8" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="200" fill="url(#th-mtn-sky)" />
    <circle cx="214" cy="74" r="46" fill="url(#th-mtn-sun)" />
    <circle cx="214" cy="74" r="17" fill="#ffe08f" />
    <path d="M0 150 L60 96 L102 132 L150 84 L210 142 L262 104 L320 150 L320 200 L0 200 Z" fill="#6b4f9c" />
    <path d="M0 172 L48 128 L92 160 L140 118 L200 168 L252 132 L320 176 L320 200 L0 200 Z" fill="#46347a" />
  </svg>
)

const BY_INDEX = [Figure, Gradient, Mountains] as const

export const Thumb = ({ index }: { index: CardIndex }): React.JSX.Element => {
  const Art = BY_INDEX[index]
  return <Art />
}
