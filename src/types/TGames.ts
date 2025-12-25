/**
 * Type definitions for games
 */

export interface GameConfig {
  gameName: string;
  gameDuration: number;
  levelCheckpoints: Array<{
    time: number;
    minScore: number;
    minLevel: number;
  }>;
  scoreLevels: Array<{
    minScore: number;
    level: number;
  }>;
}

export interface GameState {
  grid: number[];
  queue: number[];
  keepValue: number;
  score: number;
  level: number;
  timeRemaining: number;
  isPaused: boolean;
  gameOver: boolean;
  trashCount: number;
  bestScore: number;
}

export interface GameStateType {
  isPlaying: boolean;
  hasStarted: boolean;
  hasWon: boolean;
  hasTimeUp: boolean;
  timeLeft: number;
  duration: number;
}

