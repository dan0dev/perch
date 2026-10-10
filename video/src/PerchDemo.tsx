import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { ChatWindow } from './ChatWindow'
import { Composer } from './Composer'
import { Cursor } from './Cursor'
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
      <Composer expand={scene.composer.expand} glow={scene.composer.glow} tiles={scene.tiles} />

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

      {/* The drag stack. Painted trailing cards first so the grabbed card is on top. */}
      {scene.stack.visible &&
        scene.stack.cards
          .map((c, k) => (
            <PerchCard
              key={c.index}
              index={c.index}
              x={c.x}
              y={c.y}
              scale={c.scale}
              rotateY={c.rotateY}
              rotateZ={c.rotateZ}
              lift={c.lift}
              opacity={scene.stack.opacity}
              badge={k === 0 ? scene.stack.badge : 0}
              badgeText="3"
            />
          ))
          .reverse()}

      <Cursor at={scene.cursor} press={scene.press} ripples={scene.ripples} />
    </AbsoluteFill>
  )
}
