// src/components/JustDivide.jsx
import React from 'react';
import Grid from './Grid';
import RightPanel from './RightPanel';
import GameModal from './GameModal';
import useGame from '../hooks/useGame';
import { useAudio } from '../contexts/AudioManager';
import catImage from '../assets/Cat.png'; // optional

// decorative image you uploaded (local path)
const RIGHT_PANEL_DECOR = '/mnt/data/7b923722-0e59-4037-ab0e-9a9f5f9b7575.png';

export default function JustDivide() {
  const api = useGame();
  const audio = useAudio();

  const ensureAudio = () => {
    if (audio && typeof audio.ensureBackgroundPlays === 'function') {
      audio.ensureBackgroundPlays();
    } else if (api && typeof api.startBackgroundMusic === 'function') {
      api.startBackgroundMusic();
    }
  };

  const handlePauseToggle = () => {
    if (api.isPaused) api.resume();
    else api.pause();
  };

  return (
    <div className="page" onClick={ensureAudio}>
      <div className="game-stage-bg stage" role="application" aria-label="Just Divide game">
        <header className="header">
          <button id="pause-btn" className="pause" title="Pause or resume" onClick={handlePauseToggle}>
            {api.isPaused ? '▶' : '⏸'}
          </button>
          <h1 className="title">JUST DIVIDE</h1>
          <button id="help-btn" className="help" title="Help">
            ?
          </button>
        </header>

        <div className="subtitle">
          <div className="timer">
            ⏳ <span id="timer-display">{api.formattedTime}</span>
          </div>
          <div className="instruction">DIVIDE WITH THE BOTTOM NUMBERS TO SOLVE THE ROWS AND COLUMNS.</div>
        </div>

        <div className="content-row">
          <div className="center-column">
            <div className="cat-badges">
              {catImage && <img src={catImage} className="cat-image" alt="Cat mascot" />}
              <div className="badges">
                <div className="badge">
                  <span id="level-display" className="badge-text">LEVEL {api.level}</span>
                </div>
                <div className="badge">
                  <span id="score-display" className="badge-text">SCORE {api.score}</span>
                </div>
              </div>
            </div>

            <div className="board">
              <Grid
                grid={api.grid}
                onCellDrop={api.onCellDrop}
                onTilePointerDown={api.startPointerDrag}
                onTileDragStart={api.handleDragStartFallback}
              />
            </div>
          </div>

          <RightPanel
            queue={api.queue}
            keepValue={api.keepValue}
            trashCount={api.trashCount}
            onKeepClick={api.onKeepClick}
            onQueuePointerDown={api.startPointerDrag}
            onQueueDragStart={api.handleDragStartFallback}
            onKeepPointerDown={api.onKeepPointerDown}
            onKeepDragStart={api.onKeepDragStart}
            onKeepDrop={api.handleKeepDrop}
            onTrashDrop={api.handleTrashDrop}
          />
        </div>

        <div className="fullscreen-hint">⤢</div>
      </div>

      {api.isPaused && (
        <div className="modal">
          <div className="modal-card">
            <h2 className="modal-title">Paused</h2>
            <p className="modal-sub">Tap Resume to keep playing.</p>
            <button className="btn-primary" onClick={api.resume}>
              Resume
            </button>
          </div>
        </div>
      )}

      <GameModal open={api.gameOver} score={api.score} bestScore={api.bestScore} onRestart={api.restart} />
    </div>
  );
}
