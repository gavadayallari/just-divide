import React from 'react';
import type { GameStateType } from "../../types/TGames";
import MusicIcon from "../../assets/MusicIcon";
import ReplayIcon from "../../assets/ReplayIcon";
import { useAudio } from "../../contexts/AudioManager";
import "./PreviewSidebarCopy.css";

interface PreviewSidebarCopyProps {
  firstTap: boolean;
  setFirstTap: React.Dispatch<React.SetStateAction<boolean>>;
  handleStartGame: () => void;
  type: "timeUp" | "win" | "";
  handleResetGame: () => void;
  setGameState: React.Dispatch<React.SetStateAction<GameStateType>>;
  isPaused?: boolean;
  onPauseToggle?: () => void;
}

const PreviewSidebarCopy = ({
  firstTap,
  setFirstTap,
  handleStartGame,
  type,
  handleResetGame,
  setGameState,
  isPaused = false,
  onPauseToggle,
}: PreviewSidebarCopyProps) => {
  const audio = useAudio?.() as ReturnType<typeof useAudio> | undefined;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firstTap) {
      setFirstTap(false);
      handleStartGame();
    } else if (onPauseToggle) {
      // Handle pause/resume
      onPauseToggle();
    }
  };

  const handleMusicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audio && typeof audio.toggleMute === "function") {
      audio.toggleMute();
    }
  };

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Always restart the game when refresh button is clicked
    handleResetGame();
  };

  // Always show sidebar
  // Button shows:
  // - Play icon when: firstTap OR isPaused (game not playing)
  // - Pause icon when: game is actively playing (!firstTap && !isPaused)
  const isGamePlaying = !firstTap && !isPaused && type === "";
  const showPlayIcon = firstTap || isPaused;
  const isMuted = audio?.muted ?? false;
  
  // Show music and restart buttons only when game is NOT playing
  // Hide them when game is actively playing
  const showAdditionalButtons = !isGamePlaying;

  return (
    <div className={`sidebar-container ${isPaused || firstTap || type !== "" ? "paused" : ""}`}>
      <div className="sidebar-inner">
        {/* Play/Pause Button - Always visible */}
        <button
          onClick={handlePlayClick}
          className="sidebar-btn play-pause"
          aria-label={showPlayIcon ? "Start game" : "Pause game"}
          title={showPlayIcon ? "Start game" : "Pause game"}
        >
          <div className="sidebar-icon-wrapper">
            {showPlayIcon ? (
              // Show Play icon when game is not playing
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              // Show Pause icon when game is playing
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </div>
        </button>

        {/* Music Button - Only show when game is not playing */}
        {showAdditionalButtons && (
          <button
            onClick={handleMusicClick}
            className={`sidebar-btn mute ${isMuted ? "muted" : "unmuted"}`}
            aria-label={isMuted ? "Unmute music" : "Mute music"}
            title={isMuted ? "Unmute music" : "Mute music"}
          >
            <div className="sidebar-icon-wrapper">
              {isMuted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 64 64"
                  fill="none"
                >
                  {/* Red circular background */}
                  <circle cx="32" cy="32" r="30" fill="#ef4444" />
                  {/* Speaker outline on the left (no fill, only stroke) */}
                  <path
                    d="M22 24 L18 28 H14 V36 H18 L22 40 Z"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Small inner notch for speaker mouth */}
                  <path
                    d="M22 24 L26 24 L26 40 L22 40"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* X icon on the right, like reference */}
                  <line
                    x1="38" y1="26"
                    x2="48" y2="36"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <line
                    x1="48" y1="26"
                    x2="38" y2="36"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <MusicIcon />
              )}
            </div>
          </button>
        )}

        {/* Refresh Button - Only show when game is not playing */}
        {showAdditionalButtons && (
          <button
            onClick={handleRefreshClick}
            className="sidebar-btn reset"
            aria-label="Reset game"
            title="Reset game"
          >
            <div className="sidebar-icon-wrapper">
              <ReplayIcon />
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default PreviewSidebarCopy;
