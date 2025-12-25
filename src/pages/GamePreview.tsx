// src/pages/GamePreview.tsx
import React, { useState } from "react";
import Grid from "../components/Grid";
import PreviewSidebar from "../components/PreviewSidebar";
import ReplayScreen from "../components/ReplayScreen";
import TapToStart from "../components/TapToStart";
import PreviewSidebarCopy from "../components/vanila/PreviewSidebarCopy";
import useGame from "../hooks/useGame";
import { useAudio } from "../contexts/AudioManager";
import type { GameStateType } from "../types/TGames";
import { handleFullscreenToggle } from "../utils/handleFullscreenToggle";

import {
  Dialog,
  DialogContent,
  DialogClose,
} from "../components/ui/dialog";

// Image from public folder
const catImage = "/images/Cat.png";

export default function GamePreview() {
  const api = useGame();
  const audio = useAudio();

  const [firstTap, setFirstTap] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const [gameState, setGameState] = useState<GameStateType>({
    isPlaying: false,
    hasStarted: false,
    hasWon: false,
    hasTimeUp: false,
    timeLeft: 120,
    duration: 120,
  });

  const pageRef = React.useRef<HTMLDivElement | null>(null);

  // JS Safety Fix: Repaint on orientation change
  React.useEffect(() => {
    const refresh = () => {
      document.body.style.display = "none";
      // Force reflow
      void document.body.offsetHeight;
      document.body.style.display = "";
    };

    window.addEventListener("orientationchange", refresh);
    window.addEventListener("resize", refresh);

    return () => {
      window.removeEventListener("orientationchange", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, []);

  /* ---------------- AUDIO ---------------- */
  const ensureAudio = () => {
    if (audio?.ensureBackgroundPlays) {
      audio.ensureBackgroundPlays();
    } else if (api?.startBackgroundMusic) {
      api.startBackgroundMusic();
    }
  };

  /* ---------------- GAME CONTROLS ---------------- */
  const handlePauseToggle = () => {
    api.isPaused ? api.resume() : api.pause();
  };

  const handleOpenHelp = () => {
    if (!api.isPaused) api.pause();
    setIsHelpOpen(true);
  };

  const handleStartGame = () => {
    setGameState((prev) => ({
      ...prev,
      isPlaying: true,
      hasStarted: true,
    }));
    if (api.isPaused) api.resume();
  };

  React.useEffect(() => {
    setGameState((prev) => ({
      ...prev,
      isPlaying: !api.isPaused,
    }));
  }, [api.isPaused]);

  const handleResetGame = () => {
    api.restart();
    setFirstTap(false);
    setGameState((prev) => ({
      ...prev,
      isPlaying: true,
      hasStarted: true,
      hasWon: false,
      hasTimeUp: false,
      timeLeft: prev.duration,
    }));
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="orientation-root">
      <div className="rotate-overlay">
        <div className="rotate-content">
          <div className="rotate-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </div>
          <div className="rotate-title">Rotate your device</div>
          <div className="rotate-subtitle">Please rotate to landscape for the best experience.</div>
        </div>
      </div>

      <div className="game-wrapper">
        <div
          ref={pageRef}
          className="page"
          onClick={ensureAudio}
          onPointerMove={(e) => {
            if (api.activeDrag) {
              // Prevent scrolling while dragging
              e.preventDefault();
              setDragPosition({ x: e.clientX, y: e.clientY });
            }
          }}
          onPointerUp={async (e) => {
            if (api.activeDrag) {
              e.preventDefault();
              // 1. Identify Target
              const elements = document.elementsFromPoint(e.clientX, e.clientY);
              const cell = elements.find(el => el.classList.contains('cell'));
              const keep = elements.find(el => el.id === 'keep-slot' || el.closest('#keep-slot'));
              const trash = elements.find(el => el.id === 'trash-zone' || el.closest('#trash-zone'));

              // 2. Trigger Drop Actions
              if (cell) {
                const index = parseInt(cell.getAttribute('data-index') || '-1');
                if (index >= 0) {
                  await api.onCellDrop(index, { value: api.activeDrag.value, source: api.activeDrag.source });
                }
              } else if (keep) {
                api.handleKeepDrop(api.activeDrag.value, api.activeDrag.source);
              } else if (trash) {
                api.handleTrashDrop(api.activeDrag.value, api.activeDrag.source);
              }

              // 3. Reset
              api.setActiveDrag(null);
              setDragPosition(null);
            }
          }}
          style={{ touchAction: 'none' }} // Critical for mobile
        >
          {/* GHOST TILE FOR DRAGGING */}
          {api.activeDrag && dragPosition && (
            <div
              style={{
                position: 'fixed',
                left: dragPosition.x,
                top: dragPosition.y,
                transform: 'translate(-50%, -50%)',
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                pointerEvents: 'none', // Pass-through events to elements below
                zIndex: 9999,
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
              }}
              className={`ghost-tile tile ${api.activeDrag.value <= 3 ? 'blue' : api.activeDrag.value <= 5 ? 'orange' : api.activeDrag.value <= 7 ? 'pink' : api.activeDrag.value <= 9 ? 'purple' : 'red'}`}
            >
              {api.activeDrag.value}
            </div>
          )}

          <TapToStart
            firstTap={firstTap}
            setFirstTap={setFirstTap}
            handleStartGame={handleStartGame}
          />

          <PreviewSidebarCopy
            firstTap={firstTap}
            setFirstTap={setFirstTap}
            handleStartGame={handleStartGame}
            type=""
            handleResetGame={handleResetGame}
            setGameState={setGameState}
            isPaused={api.isPaused}
            onPauseToggle={handlePauseToggle}
          />

          <div className="game-stage-bg stage" role="application">
            {/* HEADER */}
            <header className="header">
              <h1 className="title">JUST DIVIDE</h1>

              <Dialog
                open={isHelpOpen}
                onOpenChange={(open) => {
                  setIsHelpOpen(open);
                  if (!open) {
                    api.resume();
                  }
                }}
              >
                <DialogContent showCloseButton={false} className="howto-dialog">
                  <div className="howto-card">
                    <div className="howto-header">How to Play</div>
                    <div className="howto-body">
                      <ul>
                        <li>🔢 Look at the numbered dots</li>
                        <li>✍️ Connect them in order</li>
                        <li>🔄 This CSS change kara na hai not other</li>
                      </ul>
                    </div>
                    <div className="howto-footer">
                      <DialogClose className="howto-button">
                        Got it
                      </DialogClose>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </header>

            {/* SUBTITLE */}
            <div className="subtitle">
              <div className="timer">⏳ {api.formattedTime}</div>
              <div className="instruction">
                DIVIDE WITH THE BOTTOM NUMBERS TO SOLVE THE ROWS AND COLUMNS.
              </div>
            </div>

            {/* CONTENT */}
            <div className="content-row">
              <div className="center-column">
                <div className="cat-badges">
                  {catImage && (
                    <img src={catImage} className="cat-image" alt="Cat mascot" />
                  )}
                  <div className="badges">
                    <div className="badge">LEVEL {api.level}</div>
                    <div className="badge">SCORE {api.score}</div>
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

              <PreviewSidebar
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

            {/* FULLSCREEN BUTTON */}
            <button
              className="fullscreen-btn-right"
              onClick={(e) => {
                e.stopPropagation();
                handleFullscreenToggle(pageRef.current ?? undefined);
              }}
              aria-label="Toggle fullscreen"
            >
              ⛶
            </button>

            {/* MOBILE LANDSCAPE ELEMENTS (Hidden by default, shown in Landscape CSS) */}
            <div className="mobile-landscape-instruction">
              DIVIDE WITH THE BOTTOM NUMBERS TO SOLVE THE ROWS AND COLUMNS.
            </div>

            <button
              className="pause-btn-mobile"
              onClick={(e) => {
                e.stopPropagation();
                handlePauseToggle();
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                {api.isPaused ? (
                  <path d="M8 5v14l11-7z" />
                ) : (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                )}
              </svg>
            </button>
          </div>

          {/* HELP BUTTON */}
          <button
            className="help-btn-right"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenHelp();
            }}
          >
            ?
          </button>

          <ReplayScreen
            open={api.gameOver}
            score={api.score}
            bestScore={api.bestScore}
            onRestart={handleResetGame}
            endReason={api.endReason === "time" ? "time" : "grid"}
          />
        </div>
      </div>
    </div>
  );
}
