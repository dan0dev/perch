import type { DragEvent, MouseEvent } from 'react'
import type { CardAction, ShelfItem } from '@shared/types'
import { flyOffLabel } from '@shared/expiry'
import { CheckIcon, CopyIcon, DraggedIcon, PinIcon, SaveIcon, TrashIcon } from './icons'

interface Props {
  item: ShelfItem
  now: number
  selected: boolean
  onToggleSelect: (id: string) => void
  onDragStart: (id: string, img: HTMLImageElement | null) => void
}

const ACTIONS: { action: CardAction; label: string; Icon: typeof CopyIcon }[] = [
  { action: 'copy', label: 'Copy to clipboard', Icon: CopyIcon },
  { action: 'save', label: 'Save as…', Icon: SaveIcon },
  { action: 'pin', label: 'Pin', Icon: PinIcon },
  { action: 'delete', label: 'Delete', Icon: TrashIcon }
]

/** Share of the snip's time left, 0..1. */
function remaining(item: ShelfItem, now: number): number {
  if (item.expiresAt === null) return 1
  const total = item.expiresAt - item.createdAt
  return total > 0 ? Math.min(1, Math.max(0, (item.expiresAt - now) / total)) : 0
}

export function Card({ item, now, selected, onToggleSelect, onDragStart }: Props): React.JSX.Element {
  const label = flyOffLabel(item.expiresAt, now)

  const handleDragStart = (e: DragEvent<HTMLLIElement>): void => {
    // Main process does the real OS drag with the file on disk.
    e.preventDefault()
    onDragStart(item.id, e.currentTarget.querySelector('img'))
  }

  const act = (action: CardAction) => (e: MouseEvent): void => {
    e.stopPropagation()
    window.perch.action(item.id, action)
  }

  const cls = ['card', selected && 'is-selected', item.dragged && 'is-dragged', item.pinned && 'is-pinned']
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={cls}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onToggleSelect(item.id)}
      title={`${item.fileName}\n${label}`}
      aria-selected={selected}
    >
      <div className="thumb">
        <img src={item.thumb} alt={item.fileName} draggable={false} />
        <span className="select-ring" aria-hidden>
          {selected && <CheckIcon width={12} height={12} />}
        </span>
        <div className="actions">
          {ACTIONS.map(({ action, label: l, Icon }) => {
            const text = action === 'pin' && item.pinned ? 'Unpin' : l
            return (
              <button
                key={action}
                type="button"
                className={action === 'pin' && item.pinned ? 'is-on' : undefined}
                title={text}
                aria-label={text}
                onClick={act(action)}
                draggable={false}
              >
                <Icon />
              </button>
            )
          })}
        </div>
      </div>

      {/* The perch: shortens as the snip's time runs out. */}
      <div className="perch" aria-hidden>
        {!item.pinned && <span style={{ transform: `scaleX(${remaining(item, now)})` }} />}
      </div>

      <div className="meta">
        <span className="dims">
          {item.dragged && (
            <span className="dragged" title="Dragged out at least once">
              <DraggedIcon width={12} height={12} /> Dragged ·
            </span>
          )}
          {item.width}×{item.height}
        </span>
        <span className="flyoff">
          {item.pinned ? (
            <>
              <PinIcon width={11} height={11} /> Pinned
            </>
          ) : (
            label
          )}
        </span>
      </div>
    </li>
  )
}
