import type { CSSProperties, ReactNode } from 'react'
import { CheckIcon, MoreIcon, TrashIcon } from './icons'
import type { CardIndex } from './layout'
import { ACCENT, ACCENT_INK, ACCENT_RGB, CARD_H, CARD_W, CHIP, FONT, PERSPECTIVE, RADIUS_IMAGE, RING, SHADOW_LIFTED, SHADOW_REST } from './perch'
import { Thumb } from './thumbs'

export interface PerchCardProps {
  index: CardIndex
  /** Centre in canvas px. */
  x: number
  y: number
  scale?: number
  rotateY?: number
  rotateZ?: number
  opacity?: number
  /** 0..1: pointer is over the card (shows the ring and the bin and more chips). */
  hover?: number
  /** 0..1: selection ring filled. */
  selected?: number
  /** 0..1: lifted off the shelf (deeper shadow, near-opaque drag image and hairline). */
  lift?: number
  /** Scale of the count badge; 0 hides it. */
  badge?: number
  badgeText?: string
}

const Chip = ({ children }: { children: ReactNode }): React.JSX.Element => (
  <div
    style={{
      display: 'grid',
      placeItems: 'center',
      width: CHIP,
      height: CHIP,
      borderRadius: '50%',
      background: 'rgba(12,14,18,0.72)',
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
      color: '#fff'
    }}
  >
    {children}
  </div>
)

/** One Perch card, drawn with the app's tokens. Used for both the shelf and the drag stack. */
export function PerchCard({
  index,
  x,
  y,
  scale = 1,
  rotateY = 0,
  rotateZ = 0,
  opacity = 1,
  hover = 0,
  selected = 0,
  lift = 0,
  badge = 0,
  badgeText = ''
}: PerchCardProps): React.JSX.Element {
  const fill = (extra: CSSProperties): CSSProperties => ({ position: 'absolute', inset: 0, borderRadius: RADIUS_IMAGE, ...extra })

  return (
    <div
      style={{
        position: 'absolute',
        left: x - CARD_W / 2,
        top: y - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        opacity,
        transform: `perspective(${PERSPECTIVE}px) rotateY(${rotateY}deg) rotate(${rotateZ}deg) scale(${scale})`
      }}
    >
      <div style={fill({ boxShadow: SHADOW_REST, opacity: 1 - lift })} />
      <div style={fill({ boxShadow: SHADOW_LIFTED, opacity: lift })} />
      <div
        style={fill({
          overflow: 'hidden',
          // The app drags at 0.88 alpha; overlapping thumbnails look muddy at this size, so stay near-opaque.
          opacity: 1 - 0.04 * lift,
          boxShadow: `0 0 0 ${4 * selected}px rgba(${ACCENT_RGB},${selected})`
        })}
      >
        <Thumb index={index} />
      </div>
      <div style={fill({ border: `1.5px solid rgba(255,255,255,${0.25 * lift})` })} />

      {/* Select ring: hinted on hover, filled when selected. */}
      <div style={{ position: 'absolute', left: 14, top: 14, width: RING, height: RING, opacity: Math.max(hover, selected) }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.92)',
            background: 'rgba(0,0,0,0.32)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.45)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            background: ACCENT,
            color: ACCENT_INK,
            opacity: selected,
            transform: `scale(${0.6 + 0.4 * selected})`
          }}
        >
          <CheckIcon width={18} height={18} />
        </div>
      </div>

      {/* Bin and more chips, on hover only. */}
      <div style={{ position: 'absolute', top: 13, right: 13, display: 'flex', gap: 9, opacity: hover }}>
        <Chip>
          <TrashIcon width={21} height={21} />
        </Chip>
        <Chip>
          <MoreIcon width={23} height={23} />
        </Chip>
      </div>

      {badge > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            display: 'grid',
            placeItems: 'center',
            minWidth: 46,
            height: 46,
            padding: '0 14px',
            borderRadius: 23,
            background: ACCENT,
            color: ACCENT_INK,
            font: `700 26px ${FONT}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            transform: `scale(${badge})`
          }}
        >
          {badgeText}
        </div>
      )}
    </div>
  )
}
