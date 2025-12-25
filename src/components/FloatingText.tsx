import React from 'react';

export interface FloatingTextProps {
  text: string;
  className?: string;
}

/**
 * Simple floating text / label component.
 * Kept minimal so it does not affect existing game logic or layout.
 */
export default function FloatingText({ text, className }: FloatingTextProps) {
  return <div className={className}>{text}</div>;
}


