import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../contexts/AudioManager';

// Number ranges per level:
// - Level 1:  2 - 10
// - Level 2:  2 - 20
// - Level 3:  2 - 30
// - Level 4:  2 - 40
// - Level 5:  2 - 50
//   (and so on: always 2 - (level * 10) from level 3+)
// Level & score rules + time limit (total game time is 10 minutes):
// Time checkpoints (game over if score too low):
// -  3 minutes  -> need 150+ score, becomes at least level 2, otherwise game over
// -  5 minutes  -> need 300+ score, becomes at least level 3, otherwise game over
// -  7 minutes  -> need 450+ score, becomes at least level 4, otherwise game over
// -  8 minutes  -> need 550+ score, becomes at least level 5, otherwise game over
// -  9 minutes  -> need 650+ score, becomes at least level 6, otherwise game over
// - 10 minutes  -> need 750+ score, becomes at least level 7, otherwise game over
// Score thresholds (instant level up when score reaches these values):
// - 150+ -> level 2
// - 300+ -> level 3
// - 450+ -> level 4
// - 550+ -> level 5
// - 650+ -> level 6
// - 750+ -> level 7
const GAME_DURATION_SECONDS = 10 * 60; // 10 minutes

const LEVEL_CHECKPOINTS = [
  { time: 3 * 60, minScore: 150, minLevel: 2 },
  { time: 5 * 60, minScore: 300, minLevel: 3 },
  { time: 7 * 60, minScore: 450, minLevel: 4 },
  { time: 8 * 60, minScore: 550, minLevel: 5 },
  { time: 9 * 60, minScore: 650, minLevel: 6 },
  { time: 10 * 60, minScore: 750, minLevel: 7 },
];

const SCORE_LEVELS = [
  { minScore: 150, level: 2 },
  { minScore: 300, level: 3 },
  { minScore: 450, level: 4 },
  { minScore: 550, level: 5 },
  { minScore: 650, level: 6 },
  { minScore: 750, level: 7 },
];

function getRangeForLevel(level) {
  const start = 2;
  // Level 1: 2-10, Level 2: 2-20, Level 3+: 2-(level*10)
  const end =
    level === 1 ? 10 :
    level === 2 ? 20 :
    level * 10;
  return { start, end };
}

function randomTileForLevel(level) {
  const { start, end } = getRangeForLevel(level);
  return Math.floor(Math.random() * (end - start + 1)) + start;
}

function deepCopyState(state) { return JSON.parse(JSON.stringify(state)); }

function getNeighbors(idx) {
  const row = Math.floor(idx / 4), col = idx % 4;
  const neighbors = [];
  if (row > 0) neighbors.push(idx - 4);
  if (row < 3) neighbors.push(idx + 4);
  if (col > 0) neighbors.push(idx - 1);
  if (col < 3) neighbors.push(idx + 1);
  return neighbors;
}

function anyValidMerge(grid) {
  for (let i = 0; i < 16; i++) {
    const v = grid[i]; if (v === 0) continue;
    for (const n of getNeighbors(i)) {
      const nv = grid[n]; if (nv === 0) continue;
      if (v === nv) return true;
      const larger = Math.max(v, nv), smaller = Math.min(v, nv);
      if (larger % smaller === 0) return true;
    }
  }
  return false;
}

function randomTile() { return TILE_POOL[Math.floor(Math.random()*TILE_POOL.length)]; }

export default function useGame() {
  const { playSound, pauseBackgroundMusic, resumeBackgroundMusic } = useAudio();

  const [grid, setGrid] = useState(Array(16).fill(0));
  // Level-based random tiles: level 1 & 2 use 2-20, level 3+ expand up to 2-(level*10)
  const [queue, setQueue] = useState([
    randomTileForLevel(1),
    randomTileForLevel(1),
    randomTileForLevel(1),
  ]);
  const [keepValue, setKeepValue] = useState(0);
  const [trashCount, setTrashCount] = useState(10);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try { return Number(localStorage.getItem('jd_best') || '0'); } catch { return 0; }
  });
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [elapsed, setElapsed] = useState(0);

  const [isPaused, setIsPaused] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const startedAtRef = useRef(Date.now());
  const draggingRef = useRef({ value: 0, source: null });
  const bgMusicStartedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[useGame] Attempting to start bg music on mount');
      playSound('bg', { restart: true });
      bgMusicStartedRef.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line

  useEffect(() => {
    const tick = () => {
      if (!isPaused) {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(secs);
        if (!gameOver) {
          // Checkpoint-based rules:
          // If we've passed a checkpoint time but don't have enough score, game over.
          // Otherwise, enforce minimum level according to highest checkpoint reached.
          let requiredLevel = 1;
          for (const cp of LEVEL_CHECKPOINTS) {
            if (secs >= cp.time) {
              if (score < cp.minScore) {
                endGame('time');
                return;
              }
              requiredLevel = cp.minLevel;
            }
          }

          setLevel(curr => Math.max(curr, requiredLevel));

          // Hard limit: after 10 minutes, always end the game.
          if (secs >= GAME_DURATION_SECONDS) {
            endGame('time');
            return;
          }
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPaused, gameOver, level, score]);

  const formattedTime = (() => {
    const s = elapsed;
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  })();

  function pushUndo() {
    setUndoStack(prev => {
      const snapshot = deepCopyState({ grid, queue, keepValue, trashCount, score, level });
      return [snapshot, ...prev].slice(0, 10);
    });
  }

  function checkGameOverAndSet(g) {
    const isFull = g.every(v => v !== 0);
    const possible = anyValidMerge(g);
    if (isFull && !possible) {
      setGameOver(true);
    }
  }

  function pause() {
    if (isPaused) return;
    playSound('click');
    setIsPaused(true);
    setToastMessage('Game paused');
    if (pauseBackgroundMusic) pauseBackgroundMusic();
    console.log('Game paused');
  }

  function resume() {
    if (!isPaused) return;
    playSound('click');
    startedAtRef.current = Date.now() - (elapsed * 1000);
    setIsPaused(false);
    setToastMessage('Game resumed');
    if (resumeBackgroundMusic) resumeBackgroundMusic();
    console.log('Game resumed');
    setTimeout(() => setToastMessage(''), 1500);
  }

  function restart() {
    playSound('click');
    pushUndo();
    setGrid(Array(16).fill(0));
    // Restart at level 1 range (1-10)
    setQueue([
      randomTileForLevel(1),
      randomTileForLevel(1),
      randomTileForLevel(1),
    ]);
    setKeepValue(0);
    setTrashCount(10);
    setScore(0);
    setLevel(1);
    setGameOver(false);
    startedAtRef.current = Date.now();
    setElapsed(0);
    setIsPaused(false);
    setToastMessage('');
    playSound('bg', { restart: true });
    bgMusicStartedRef.current = true;
  }

  function undo() {
    setUndoStack(prev => {
      if (!prev || prev.length === 0) return prev;
      const [top, ...rest] = prev;
      if (top) {
        setGrid(top.grid);
        setQueue(top.queue);
        setKeepValue(top.keepValue);
        setTrashCount(top.trashCount);
        setScore(top.score);
        setLevel(top.level);
        setGameOver(false);
      }
      return rest;
    });
  }

  function runMergesAfterPlacement(stateGrid, placedIdx, placedValue) {
    const g = stateGrid.slice();
    g[placedIdx] = placedValue;
    const toInspect = [placedIdx];
    let totalScoreGain = 0;

    while (toInspect.length) {
      const idx = toInspect.pop();
      const val = g[idx];
      if (!val || val === 0) continue;

      const neighbors = getNeighbors(idx);

      for (const n of neighbors) {
        const nv = g[n];
        if (!nv || nv === 0) continue;

        if (nv === val) {
          // Same-value merge: +5 score
          totalScoreGain += 5;
          g[idx] = 0; g[n] = 0;
          toInspect.push(...getNeighbors(idx), ...getNeighbors(n));
          // Do NOT break; allow this value to interact with all sides
          continue;
        }

        const larger = Math.max(val, nv), smaller = Math.min(val, nv);
        if (larger % smaller === 0) {
          const result = larger / smaller;
          const largerIdx = val === larger ? idx : n;
          const smallerIdx = val === smaller ? idx : n;

          // Division merge: also +5 score (same as equal merge)
          totalScoreGain += 5;

          if (result === 1) g[largerIdx] = 0;
          else g[largerIdx] = result;

          g[smallerIdx] = 0;
          toInspect.push(...getNeighbors(largerIdx), ...getNeighbors(smallerIdx));
          // Do NOT break; allow division with all valid neighbors around this value
          continue;
        }
      }
    }

    return { newGrid: g, gained: totalScoreGain };
  }

  function consumeDraggedSource(source) {
    if (source === 'queue') {
      setQueue(prev => {
        const next = prev.slice(1);
        next.push(randomTileForLevel(level));
        return next;
      });
    } else if (source === 'keep') {
      setKeepValue(0);
    }
  }

  async function onCellDrop(index, { value = null, source = null } = {}) {
    if (isPaused) return;
    if (gameOver) return;
    if (grid[index] !== 0) return;

    const active = value ?? draggingRef.current.value ?? queue[0];
    const activeSource = source ?? draggingRef.current.source ?? 'queue';
    if (!active) return;
    if (activeSource === 'keep' && keepValue === 0) return;

    if (!bgMusicStartedRef.current) {
      console.log('[useGame] Starting background music on first interaction');
      playSound('bg', { restart: true });
      bgMusicStartedRef.current = true;
    }

    pushUndo();

    const { newGrid, gained } = runMergesAfterPlacement(grid, index, active);

    consumeDraggedSource(activeSource);
    setGrid(newGrid);

    playSound('drop');

    setScore(prev => {
      const ns = prev + gained;
      setBestScore(bs => {
        const updated = Math.max(bs, ns);
        try { localStorage.setItem('jd_best', String(updated)); } catch {}
        return updated;
      });
      // Instant level up based purely on score thresholds
      setLevel(curr => {
        let target = curr;
        for (const sl of SCORE_LEVELS) {
          if (ns >= sl.minScore) {
            target = Math.max(target, sl.level);
          }
        }
        return target;
      });
      return ns;
    });

    draggingRef.current = { value: 0, source: null };

    playSound('drop');

    setTimeout(() => checkGameOverAndSet(newGrid), 0);
  }

  function handleKeepDrop(value, source) {
    if (isPaused) return false;
    if (gameOver) return false;
    if (source !== 'queue') return false;
    if (keepValue !== 0) return false;

    if (!bgMusicStartedRef.current) {
      console.log('[useGame] Starting background music on first interaction');
      playSound('bg', { restart: true });
      bgMusicStartedRef.current = true;
    }

    pushUndo();
    setQueue(prev => {
      const next = prev.slice(1);
      next.push(randomTileForLevel(level));
      return next;
    });
    setKeepValue(value);
    draggingRef.current = { value: 0, source: null };
    playSound('click');
    return true;
  }

  function handleTrashDrop(value, source) {
    if (isPaused) return false;
    if (gameOver) return false;
    if (typeof trashCount !== 'number' || trashCount <= 0) return false;
    if (!source) return false;

    if (!bgMusicStartedRef.current) {
      console.log('[useGame] Starting background music on first interaction');
      playSound('bg', { restart: true });
      bgMusicStartedRef.current = true;
    }

    pushUndo();

    setTrashCount(prev => {
      const next = Math.max(0, prev - 1);
      return next;
    });

    consumeDraggedSource(source);

    setScore(prev => {
      const ns = Math.max(0, prev - 10);
      setBestScore(bs => {
        const updated = Math.max(bs, ns);
        try { localStorage.setItem('jd_best', String(updated)); } catch {}
        return updated;
      });
      return ns;
    });

    draggingRef.current = { value: 0, source: null };
    playSound('trash');
    return true;
  }

  function startPointerDrag(e, value, source) {
    if (isPaused) {
      setToastMessage('Resume to move tiles');
      setTimeout(() => setToastMessage(''), 1000);
      return;
    }
    if (!bgMusicStartedRef.current) {
      console.log('[useGame] Starting background music on first interaction');
      playSound('bg', { restart: true });
      bgMusicStartedRef.current = true;
    }
    draggingRef.current = { value, source };
    playSound('click');
    try { e.dataTransfer?.setData('text/plain', String(value)); } catch {}
  }

  function handleDragStartFallback(e, value, source) {
    if (isPaused) {
      e.preventDefault?.();
      setToastMessage('Resume to move tiles');
      setTimeout(() => setToastMessage(''), 1000);
      return;
    }
    if (!bgMusicStartedRef.current) {
      console.log('[useGame] Starting background music on first interaction');
      playSound('bg', { restart: true });
      bgMusicStartedRef.current = true;
    }
    draggingRef.current = { value, source };
    playSound('click');
    try { e.dataTransfer?.setData('text/plain', String(value)); } catch {}
  }

  function onQueuePointerDown(e, value, source) { startPointerDrag(e, value, source); }
  function onQueueDragStart(e, value, source) { handleDragStartFallback(e, value, source); }
  function onKeepPointerDown(e, value, source) { startPointerDrag(e, value, source); }
  function onKeepDragStart(e, value, source) { handleDragStartFallback(e, value, source); }

  function useTrash() {
    if (isPaused) return;
    const active = queue[0];
    if (!active || trashCount <= 0) return;
    if (!bgMusicStartedRef.current) {
      console.log('[useGame] Starting background music on first interaction');
      playSound('bg', { restart: true });
      bgMusicStartedRef.current = true;
    }
    pushUndo();
    setTrashCount(prev => Math.max(0, prev - 1));
    setQueue(prev => {
      const next = prev.slice(1);
      next.push(randomTileForLevel(level));
      return next;
    });
    setScore(prev => {
      const ns = Math.max(0, prev - 10);
      setBestScore(bs => {
        const updated = Math.max(bs, ns);
        try { localStorage.setItem('jd_best', String(updated)); } catch {}
        return updated;
      });
      return ns;
    });
    playSound('trash');
  }

  function startBackgroundMusic() {
    if (!bgMusicStartedRef.current) {
      playSound('bg', { restart: true });
      bgMusicStartedRef.current = true;
    }
  }

  function endGame(reason = 'time') {
    setGameOver(true);
    setIsPaused(true);
    playSound('gameover');
    if (reason === 'time') {
      setToastMessage("Time's up!");
      setTimeout(() => setToastMessage(''), 1800);
    }
    console.log('Game ended because:', reason);
  }

  const api = {
    grid, queue, keepValue, trashCount, score, bestScore, level, formattedTime, gameOver,
    restart, undo, useTrash,
    onCellDrop, startPointerDrag, handleDragStartFallback,
    onQueuePointerDown, onQueueDragStart, onKeepPointerDown, onKeepDragStart,
    onKeepClick: () => {},
    handleKeepDrop, handleTrashDrop,
    toggleHints: () => {},
    _pushUndo: pushUndo,
    isPaused, pause, resume, toastMessage,
    startBackgroundMusic,
  };

  return api;
}

