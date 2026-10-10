import type { Point } from './layout'

/** Arrow tip inside the 44x44 box (the SVG is a 22-unit drawing at 2x). */
const TIP = { x: 4, y: 3 }

interface CursorProps {
  at: Point
  /** 0..1 how far the button is pressed. */
  press: number
  ripples: { x: number; y: number; t: number }[]
}

/** Windows-style arrow cursor with a soft shadow, press scale and click ripples. */
export function Cursor({ at, press, ripples }: CursorProps): React.JSX.Element {
  return (
    <>
      {ripples.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: r.x - 22,
            top: r.y - 22,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.8)',
            opacity: 0.7 * (1 - r.t),
            transform: `scale(${0.35 + 1.25 * r.t})`
          }}
        />
      ))}
      <svg
        width={44}
        height={44}
        viewBox="0 0 22 22"
        style={{
          position: 'absolute',
          left: at.x - TIP.x,
          top: at.y - TIP.y,
          overflow: 'visible',
          transform: `scale(${1 - 0.14 * press})`,
          transformOrigin: `${TIP.x}px ${TIP.y}px`,
          filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5))'
        }}
      >
        <path
          d="M2 1.5 V17.2 L6.2 13.4 L8.9 19.6 L11.7 18.4 L9 12.3 L14.6 12.2 Z"
          fill="#ffffff"
          stroke="#111111"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    </>
  )
}
