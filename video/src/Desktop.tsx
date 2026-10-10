import { AbsoluteFill } from 'remotion'

const TASKBAR_H = 76
const APPS = ['#4ea1ff', '#ffb84e', '#6be08b', '#c785ff', '#ff7a7a', '#e8eaed', '#5fd3e6']

/** Dark abstract wallpaper and a slim Windows 11 style taskbar. No logos. */
export function Desktop(): React.JSX.Element {
  return (
    <AbsoluteFill
      style={{
        background: [
          'radial-gradient(760px 640px at 82% 16%, rgba(64,110,255,0.60), transparent 62%)',
          'radial-gradient(820px 760px at 8% 86%, rgba(0,176,214,0.38), transparent 62%)',
          'radial-gradient(640px 520px at 58% 62%, rgba(132,70,214,0.40), transparent 66%)',
          '#070b18'
        ].join(', ')
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: TASKBAR_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          background: 'rgba(22,26,36,0.78)',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {APPS.map((c) => (
          <div
            key={c}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(145deg, ${c}, rgba(255,255,255,0.18))`,
              opacity: 0.92
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
