import React from 'react';

export default function GameModal({ open, score, bestScore, onRestart }) {
  if (!open) return null;
  return (
    <div className="modal">
      <div className="modal-card">
        <h2 className="modal-title">Game Over!</h2>
        <p className="modal-sub">Your grid is full.</p>
        <div className="modal-final">
          Final Score: <span id="modal-score">{score}</span>
        </div>
        <div className="modal-best">
          Best Score: <span id="modal-best-score">{bestScore}</span>
        </div>
        <button id="restart-button" className="btn-primary" onClick={onRestart}>
          Play Again
        </button>
      </div>
    </div>
  );
}
