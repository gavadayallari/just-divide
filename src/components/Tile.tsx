import React from 'react';

function tileColorClass(value: number): string {
  if (value <= 3) return 'blue';
  if (value <= 5) return 'orange';
  if (value <= 7) return 'pink';
  if (value <= 9) return 'purple';
  return 'red';
}

interface TileProps {
  value: number;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
}

export default function Tile({
  value,
  onPointerDown,
  onDragStart,
  draggable = true,
}: TileProps) {
  const props: React.HTMLAttributes<HTMLDivElement> = {};
  if (typeof onPointerDown === 'function') props.onPointerDown = onPointerDown;
  if (typeof onDragStart === 'function') props.onDragStart = onDragStart;
  (props as any).draggable = draggable;

  const style: React.CSSProperties = {};
  if (draggable) style.touchAction = 'none';

  return (
    <div
      className={`tile ${tileColorClass(
        value,
      )} text-xl font-bold flex items-center justify-center select-none`}
      {...props}
      style={style}
      aria-grabbed={draggable ? 'false' : 'true'}
    >
      {value}
    </div>
  );
}


