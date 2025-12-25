import React from 'react';
import Tile from './Tile';

const placementBox = '/images/Placement_Box.png';

interface DropPayload {
  value: number;
  source: string;
}

interface GridProps {
  grid: number[];
  onCellDrop: (index: number, payload?: DropPayload) => Promise<void> | void;
  onTilePointerDown?: (e: React.PointerEvent, value: number, source: string) => void;
  onTileDragStart?: (e: React.DragEvent, value: number, source: string) => void;
}

export default function Grid({
  grid,
  onCellDrop,
  onTilePointerDown,
  onTileDragStart,
}: GridProps) {
  return (
    <div
      className="grid"
      style={{ gridTemplateRows: 'repeat(4, var(--tile-size))' }}
      role="grid"
      aria-label="game-grid"
    >
      {grid.map((v, i) => (
        <div
          key={i}
          className="cell"
          data-index={i}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over-cell');
          }}
          onDragLeave={(e) => e.currentTarget.classList.remove('drag-over-cell')}
          onDrop={async (ev) => {
            ev.preventDefault();
            ev.currentTarget.classList.remove('drag-over-cell');

            let payload: DropPayload | null = null;
            try {
              const rawJson =
                ev.dataTransfer?.getData &&
                ev.dataTransfer.getData('application/json');
              if (rawJson) payload = JSON.parse(rawJson);
            } catch {
              payload = null;
            }

            if (!payload) {
              try {
                const rawText =
                  ev.dataTransfer?.getData &&
                  ev.dataTransfer.getData('text/plain');
                if (rawText) {
                  const n = parseInt(rawText, 10);
                  if (!Number.isNaN(n))
                    payload = { value: n, source: 'queue' };
                }
              } catch {
                payload = null;
              }
            }

            if (payload && typeof onCellDrop === 'function') {
              await onCellDrop(i, {
                value: payload.value,
                source: payload.source,
              });
              return;
            }

            if (typeof onCellDrop === 'function') {
              await onCellDrop(i);
            }
          }}
          style={{
            backgroundImage: `url(${placementBox})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: 'contain',
          }}
        >
          {v !== 0 && (
            <Tile
              value={v}
              draggable={false}
              onPointerDown={(e) =>
                onTilePointerDown && onTilePointerDown(e, v, 'grid')
              }
              onDragStart={(e) =>
                onTileDragStart && onTileDragStart(e, v, 'grid')
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}


