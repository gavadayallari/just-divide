import React from 'react';

interface DropPayload {
  value: number;
  source: string;
}

interface PreviewSidebarProps {
  queue: number[];
  keepValue: number;
  trashCount: number;
  onKeepClick?: () => void;
  onQueuePointerDown?: (e: React.PointerEvent, value: number, source: string) => void;
  onQueueDragStart?: (e: React.DragEvent, value: number, source: string) => void;
  onKeepPointerDown?: (e: React.PointerEvent, value: number, source: string) => void;
  onKeepDragStart?: (e: React.DragEvent, value: number, source: string) => void;
  onKeepDrop?: (value: number, source: string) => void;
  onTrashDrop?: (value: number, source: string) => void;
}

function tileClass(v: number): string {
  if (v <= 3) return 'blue';
  if (v <= 5) return 'orange';
  if (v <= 7) return 'pink';
  if (v <= 9) return 'purple';
  return 'red';
}

/**
 * Sidebar / queue panel (renamed from RightPanel).
 * Logic and markup are copied from the original RightPanel component.
 */
export default function PreviewSidebar({
  queue,
  keepValue,
  trashCount,
  onKeepClick,
  onQueuePointerDown,
  onQueueDragStart,
  onKeepPointerDown,
  onKeepDragStart,
  onKeepDrop,
  onTrashDrop,
}: PreviewSidebarProps) {
  return (
    <aside className="right-panel">
      <div id="keep-zone" className="keep drop-zone">
        <div
          id="keep-slot"
          className="keep-slot"
          onClick={onKeepClick}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over-cell');
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('drag-over-cell');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over-cell');
            let payload: DropPayload | null = null;
            try {
              const rawJson = e.dataTransfer.getData('application/json');
              if (rawJson) payload = JSON.parse(rawJson);
            } catch {
              payload = null;
            }
            if (!payload) {
              const rawText = e.dataTransfer.getData('text/plain');
              const n = parseInt(rawText, 10);
              if (!Number.isNaN(n)) payload = { value: n, source: 'queue' };
            }
            if (!payload || typeof payload.value !== 'number') return;
            if (typeof onKeepDrop === 'function') onKeepDrop(payload.value, payload.source);
          }}
        >
          {keepValue !== 0 && (
            <div
              className={`tile ${tileClass(keepValue)}`}
              onPointerDown={(e) =>
                onKeepPointerDown && onKeepPointerDown(e, keepValue, 'keep')
              }
              draggable
              onDragStart={(e) => {
                try {
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({ value: keepValue, source: 'keep' }),
                  );
                } catch {}
                onKeepDragStart && onKeepDragStart(e, keepValue, 'keep');
              }}
            >
              {keepValue}
            </div>
          )}
        </div>
        <div className="keep-text">KEEP</div>
      </div>

      <div className="queue-block">
        <div id="queue-stack" className="queue-stack">
          {queue.map((val, idx) => (
            <div
              key={idx}
              className={`tile ${tileClass(val)} queue-tile ${idx === 0 ? 'active' : 'stacked'}`}
              style={{
                transform: idx === 0 ? 'none' : `scale(${1 - idx * 0.12})`,
                opacity: idx === 0 ? 1 : 0.85,
                cursor: idx === 0 ? 'grab' : 'default',
              }}
              onPointerDown={(e) =>
                idx === 0 &&
                onQueuePointerDown &&
                onQueuePointerDown(e, val, 'queue')
              }
              draggable={idx === 0}
              onDragStart={(e) => {
                if (idx !== 0) return;
                try {
                  e.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({ value: val, source: 'queue' }),
                  );
                } catch {}
                onQueueDragStart && onQueueDragStart(e, val, 'queue');
              }}
            >
              {val}
            </div>
          ))}
        </div>
      </div>

      <div
        id="trash-zone"
        className="trash drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('drag-over-cell');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('drag-over-cell');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over-cell');
          let payload: DropPayload | null = null;
          try {
            const rawJson = e.dataTransfer.getData('application/json');
            if (rawJson) payload = JSON.parse(rawJson);
          } catch {
            payload = null;
          }
          if (!payload) {
            const rawText = e.dataTransfer.getData('text/plain');
            const n = parseInt(rawText, 10);
            if (!Number.isNaN(n)) payload = { value: n, source: 'queue' };
          }
          if (!payload || typeof payload.value !== 'number') return;
          if (typeof onTrashDrop === 'function') onTrashDrop(payload.value, payload.source);
        }}
      >
        <div className="trash-title">TRASH</div>
        <div className="trash-inner">
          <div className="trash-icon">🗑️</div>
          <div className="trash-count">x{trashCount}</div>
        </div>
      </div>
    </aside>
  );
}

