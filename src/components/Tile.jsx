// src/components/Tile.jsx
import React from 'react';

function tileColorClass(value) {
  if (value <= 3) return "blue";
  if (value <= 5) return "orange";
  if (value <= 7) return "pink";
  if (value <= 9) return "purple";
  return "red";
}

export default function Tile({ value, onPointerDown, onDragStart, draggable = true }) {
  // only include handlers and draggable attribute when provided
  const props = {};
  if (typeof onPointerDown === 'function') props.onPointerDown = onPointerDown;
  if (typeof onDragStart === 'function') props.onDragStart = onDragStart;
  // set draggable attribute explicitly (boolean)
  props.draggable = draggable;

  // also prevent touch scrolling while dragging when draggable
  const style = {};
  if (draggable) style.touchAction = 'none';

  return (
    <div
      className={`tile ${tileColorClass(value)} text-xl font-bold flex items-center justify-center select-none`}
      {...props}
      style={style}
      aria-grabbed={draggable ? "false" : "true"}
    >
      {value}
    </div>
  );
}
