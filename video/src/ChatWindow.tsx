import { PORTRAIT, type Layout } from './layout'

const TITLE_H = 56

const Control = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <div style={{ display: 'grid', placeItems: 'center', width: 64, height: TITLE_H, color: 'rgba(255,255,255,0.72)' }}>{children}</div>
)

/** Generic dark chat window with Windows 11 caption buttons. The body stays empty on purpose. */
export function ChatWindow({ layout = PORTRAIT }: { layout?: Layout }): React.JSX.Element {
  const { WINDOW } = layout
  const glyph = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const
  return (
    <div
      style={{
        position: 'absolute',
        left: WINDOW.x,
        top: WINDOW.y,
        width: WINDOW.w,
        height: WINDOW.h,
        borderRadius: 14,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #181c24 0%, #12151b 100%)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 50px 100px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: TITLE_H,
          paddingLeft: 22,
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <svg {...glyph} width={26} height={26} viewBox="0 0 26 26" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <rect x="3" y="4" width="20" height="18" rx="4" />
          <path d="M10 4v18" />
        </svg>
        <div style={{ display: 'flex' }}>
          <Control>
            <svg {...glyph}>
              <path d="M4 10h12" />
            </svg>
          </Control>
          <Control>
            <svg {...glyph}>
              <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" />
            </svg>
          </Control>
          <Control>
            <svg {...glyph}>
              <path d="m4.5 4.5 11 11M15.5 4.5l-11 11" />
            </svg>
          </Control>
        </div>
      </div>
    </div>
  )
}
