// src/components/Grid.jsx
import React from 'react';
import Tile from './Tile';
import placementBox from '../assets/Placement_Box.png';

export default function Grid({ grid, onCellDrop, onTilePointerDown, onTileDragStart }) {
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

            // Try structured payload first, then fallback, then call onCellDrop(i)
            let payload = null;
            try {
              const rawJson = ev.dataTransfer?.getData && ev.dataTransfer.getData('application/json');
              if (rawJson) payload = JSON.parse(rawJson);
            } catch (err) { payload = null; }

            if (!payload) {
              try {
                const rawText = ev.dataTransfer?.getData && ev.dataTransfer.getData('text/plain');
                if (rawText) {
                  const n = parseInt(rawText, 10);
                  if (!Number.isNaN(n)) payload = { value: n, source: 'queue' };
                }
              } catch (err) { payload = null; }
            }

            if (payload && typeof onCellDrop === 'function') {
              await onCellDrop(i, { value: payload.value, source: payload.source });
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
            backgroundSize: 'contain'
          }}
        >
          {v !== 0 && (
            // IMPORTANT: For tiles already on the grid we do NOT pass pointer/drag handlers
            // and set draggable={false} so they can't be picked up again accidentally.
            <Tile
              value={v}
              draggable={false}
            />
          )}
        </div>
      ))}
    </div>
  );
}
