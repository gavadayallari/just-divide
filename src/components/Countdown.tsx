import React from 'react';
import useGame from '../hooks/useGame';

/**
 * Countdown timer display component.
 * Uses the existing game hook so no timer logic or styling changes.
 */
export default function Countdown() {
  const api = useGame();

  return (
    <div className="timer">
      ⏳ <span id="timer-display">{api.formattedTime}</span>
    </div>
  );
}


