import type { DragEvent, MouseEvent } from 'react'
import type { CardAction, ShelfItem } from '@shared/types'
import { flyOffLabel } from '@shared/expiry'
import { CheckIcon, CopyIcon, MoreIcon, PinIcon, SaveIcon, TrashIcon } from './icons'

interface Props {
  item: ShelfItem
  leaving: boolean
  now: number
  selected: boolean
  menuOpen: boolean
  onToggleSelect: (id: string) => void
  onToggleMenu: (id: string | null) => void
  onDragStart: (id: string, img: HTMLImageElement | null) => void
}

export function Card({ item, leaving, now, selected, menuOpen, onToggleSelect, onToggleMenu, onDragStart }: Props): React.JSX.Element {
  const label = flyOffLabel(item.expiresAt, now)

  const handleDragStart = (e: DragEvent<HTMLLIElement>): void => {
    // Main process does the real OS drag with the file on disk.
    e.preventDefault()
    onToggleMenu(null)
    onDragStart(item.id, e.currentTarget.querySelector('img'))
  }

  const run = (action: CardAction) => (e: MouseEvent): void => {
    e.stopPropagation()
    onToggleMenu(null)
    window.perch.action(item.id, action)
  }

  const cls = [
    'card',
    leaving && 'is-leaving',
    selected && 'is-selected',
    item.dragged && 'is-dragged',
    item.pinned && 'is-pinned',
    menuOpen && 'has-menu'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      className={cls}
      draggable={!leaving}
      onDragStart={handleDragStart}
      onClick={() => !leaving && onToggleSelect(item.id)}
      onDoubleClick={() => !leaving && window.perch.action(item.id, 'open')}
      aria-hidden={leaving || undefined}
      title={`${item.fileName} · ${item.width}×${item.height}\n${label}${item.dragged ? '\nDragged out' : ''}`}
      aria-selected={selected}
    >
      <div className="glass">
        <div className="frame">
          <img src={item.thumb} alt={item.fileName} draggable={false} />
        </div>

        <span className="select-ring" aria-hidden>
          {selected && <CheckIcon width={12} height={12} />}
        </span>

        <div className="chips">
          {item.pinned && (
            <button type="button" className="chip is-on" title="Unpin" aria-label="Unpin" onClick={run('pin')} draggable={false}>
              <PinIcon width={15} height={15} />
            </button>
          )}
          <button
            type="button"
            className="chip more"
            title="More"
            aria-label="More actions"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation()
              onToggleMenu(menuOpen ? null : item.id)
            }}
            draggable={false}
          >
            <MoreIcon width={16} height={16} />
          </button>
        </div>

        {menuOpen && (
          <div className="menu" role="menu" onClick={(e) => e.stopPropagation()}>
            <button type="button" role="menuitem" onClick={run('copy')}>
              <CopyIcon /> Copy
            </button>
            <button type="button" role="menuitem" onClick={run('save')}>
              <SaveIcon /> Save as…
            </button>
            <button type="button" role="menuitem" onClick={run('pin')}>
              <PinIcon /> {item.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button type="button" role="menuitem" onClick={run('delete')}>
              <TrashIcon /> Delete
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
