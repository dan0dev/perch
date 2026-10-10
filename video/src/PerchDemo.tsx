import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { ChatWindow } from './ChatWindow'
import { Desktop } from './Desktop'
import { CARD_INDICES, cardCenter } from './layout'
import { FONT, SPIN_DEG, TILT_DEG } from './perch'
import { PerchCard } from './PerchCard'
import { sceneAt } from './timeline'

export function PerchDemo(): React.JSX.Element {
  const scene = sceneAt(useCurrentFrame())

  return (
    <AbsoluteFill style={{ fontFamily: FONT, overflow: 'hidden' }}>
      <Desktop />
      <ChatWindow />

      {/* The shelf: cards stay put while a copy is dragged away, like the real app. */}
      {CARD_INDICES.map((i) => {
        const c = cardCenter(i)
        const s = scene.shelf[i]!
        return (
          <PerchCard
            key={i}
            index={i}
            x={c.x}
            y={c.y}
            rotateY={TILT_DEG}
            rotateZ={SPIN_DEG[i]}
            hover={s.hover}
            selected={s.selected}
            opacity={1 - 0.65 * s.ghost}
          />
        )
      })}
    </AbsoluteFill>
  )
}
