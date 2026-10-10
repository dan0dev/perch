import type { DragEvent, MouseEvent } from 'react'
import type { CardAction, ShelfItem } from '@shared/types'
import { flyOffLabel } from '@shared/expiry'
import { CheckIcon, CopyIcon, PinIcon, SaveIcon, TrashIcon } from './icons'

interface Props {
  item: ShelfItem
  now: number
  selected: boolean
  onToggleSelect: (id: string) => void
  onDragStart: (id: string) => void
}

const ACTIONS: { action: CardAction; label: string; Icon: typeof CopyIcon }[] = [
  { action: 'copy', label: 'Copy to clipboard', Icon: CopyIcon },
  { action: 'save', label: 'Save as…', Icon: SaveIcon },
  { action: 'pin', label: 'Pin (skips expiry)', Icon: PinIcon },
  { action: 'delete', label: 'Delete', Icon: TrashIcon }
]

export function Card({ item, now, selected, onToggleSelect, onDragStart }: Props): React.JSX.Element {
  const label = flyOffLabel(item.expiresAt, now)

  const handleDragStart = (e: DragEvent): void => {
    // Main process does the real OS drag with the file on disk.
    e.preventDefault()
    onDragStart(item.id)
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
        {selected && (
          <span className="check" aria-hidden>
            <CheckIcon width={12} height={12} />
          </span>
        )}
        <div className="actions">
          {ACTIONS.map(({ action, label: l, Icon }) => (
            <button
              key={action}
              type="button"
              className={action === 'pin' && item.pinned ? 'is-on' : undefined}
              title={action === 'pin' && item.pinned ? 'Unpin' : l}
              aria-label={action === 'pin' && item.pinned ? 'Unpin' : l}
              onClick={act(action)}
              draggable={false}
            >
              <Icon />
            </button>
          ))}
        </div>
      </div>
      <div className="meta">
        <span className="dims">
          {item.width}×{item.height}
        </span>
        <span className={item.pinned ? 'flyoff is-pinned' : 'flyoff'}>
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
