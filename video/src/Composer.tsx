import { ArrowUpIcon, CheckIcon, PlusIcon, UploadIcon } from './icons'
import { COMPOSER, TILE, composerHeight, composerTop, type CardIndex } from './layout'
import { ACCENT, ACCENT_RGB, FONT, RADIUS_IMAGE } from './perch'
import { Thumb } from './thumbs'
import type { Scene } from './timeline'

const INPUT_H = COMPOSER.restH
const TOP_H = COMPOSER.fullH - COMPOSER.restH
const RING_R = 17
const RING_C = 2 * Math.PI * RING_R

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** An attachment: lands with a spring, shows a progress ring, then resolves to a check. */
function Tile({ index, state }: { index: CardIndex; state: Scene['tiles'][number] }): React.JSX.Element {
  const dim = 0.5 * (1 - state.check)
  return (
    <div
      style={{
        position: 'absolute',
        left: TILE.padX + index * (TILE.w + TILE.gap),
        top: TILE.padTop,
        width: TILE.w,
        height: TILE.h,
        borderRadius: RADIUS_IMAGE,
        overflow: 'hidden',
        opacity: Math.min(1, state.enter * 1.6),
        transform: `translateY(${(1 - state.enter) * 28}px) scale(${0.86 + 0.14 * state.enter})`,
        boxShadow: '0 8px 18px rgba(0,0,0,0.35)'
      }}
    >
      <Thumb index={index} />
      <div style={{ position: 'absolute', inset: 0, background: `rgba(10,12,16,${dim})` }} />
      <svg
        width={48}
        height={48}
        viewBox="0 0 48 48"
        style={{ position: 'absolute', left: TILE.w / 2 - 24, top: TILE.h / 2 - 24, opacity: state.ring > 0 ? 1 - state.check : 0 }}
      >
        <circle cx="24" cy="24" r={RING_R} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={RING_R}
          fill="none"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - state.ring)}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'grid',
          placeItems: 'center',
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'rgba(12,14,18,0.78)',
          color: '#fff',
          transform: `scale(${state.check})`
        }}
      >
        <CheckIcon width={20} height={20} />
      </div>
    </div>
  )
}

interface ComposerProps {
  expand: number
  glow: number
  tiles: Scene['tiles']
}

/** Chat input. Rests one row tall; opens upward into a drop zone, then holds the attachments. */
export function Composer({ expand, glow, tiles }: ComposerProps): React.JSX.Element {
  const border = `rgba(${lerp(255, 107, glow)},${lerp(255, 175, glow)},${lerp(255, 208, glow)},${lerp(0.1, 0.95, glow)})`
  return (
    <div
      style={{
        position: 'absolute',
        left: COMPOSER.x,
        top: composerTop(expand),
        width: COMPOSER.w,
        height: composerHeight(expand),
        borderRadius: 28,
        overflow: 'hidden',
        background: '#1d222b',
        border: `1.5px solid ${border}`,
        boxShadow: [
          `0 0 0 ${4 * glow}px rgba(${ACCENT_RGB},${0.3 * glow})`,
          `0 0 ${60 * glow}px rgba(${ACCENT_RGB},${0.32 * glow})`,
          '0 18px 40px rgba(0,0,0,0.35)'
        ].join(', ')
      }}
    >
      {/* Top region is anchored to the input row, so it is revealed as the composer opens. */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: INPUT_H, height: TOP_H }}>
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: 20,
            border: `2px dashed rgba(${ACCENT_RGB},0.85)`,
            background: `rgba(${ACCENT_RGB},0.07)`,
            // Gone once the first tile has landed, so no label fragments show between tiles.
            opacity: glow * (1 - Math.min(1, tiles[0]!.enter))
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              marginTop: 4,
              color: '#cfe8f4',
              font: `600 24px ${FONT}`
            }}
          >
            <UploadIcon width={26} height={26} />
            Drop to attach
          </div>
        </div>
        {([0, 1, 2] as const).map((i) => (
          <Tile key={i} index={i} state={tiles[i]!} />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: INPUT_H,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 22px'
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}>
          <PlusIcon width={26} height={26} />
        </div>
        <div style={{ flex: 1, color: 'rgba(255,255,255,0.42)', font: `400 28px ${FONT}` }}>Ask anything…</div>
        <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: '50%', background: ACCENT, color: '#0b2233' }}>
          <ArrowUpIcon width={26} height={26} />
        </div>
      </div>
    </div>
  )
}
