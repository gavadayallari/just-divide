import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../contexts/AudioManager';

const TILE_POOL = [2,3,4,5,6,7,8,9,10,12,15,16,18,20,24,25,27,30,32,35];
const LEVEL_THRESHOLD = 100;
const GAME_DURATION_SECONDS = 10 * 60;

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
  const [queue, setQueue] = useState([randomTile(), randomTile(), randomTile()]);
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
        if (secs >= GAME_DURATION_SECONDS && !gameOver) {
          endGame('time');
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPaused, gameOver]);

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
    setQueue([randomTile(), randomTile(), randomTile()]);
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
      let merged = false;

      for (const n of neighbors) {
        const nv = g[n];
        if (!nv || nv === 0) continue;

        if (nv === val) {
          totalScoreGain += 5;
          g[idx] = 0; g[n] = 0;
          toInspect.push(...getNeighbors(idx), ...getNeighbors(n));
          merged = true;
          break;
        }

        const larger = Math.max(val, nv), smaller = Math.min(val, nv);
        if (larger % smaller === 0) {
          const result = larger / smaller;
          const largerIdx = val === larger ? idx : n;
          const smallerIdx = val === smaller ? idx : n;

          totalScoreGain += 10;

          if (result === 1) g[largerIdx] = 0;
          else g[largerIdx] = result;

          g[smallerIdx] = 0;
          toInspect.push(...getNeighbors(largerIdx), ...getNeighbors(smallerIdx));
          merged = true;
          break;
        }
      }

      if (merged) continue;
    }

    return { newGrid: g, gained: totalScoreGain };
  }

  function consumeDraggedSource(source) {
    if (source === 'queue') {
      setQueue(prev => {
        const next = prev.slice(1);
        next.push(randomTile());
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
      const newLevel = Math.floor(ns / LEVEL_THRESHOLD) + 1;
      if (newLevel > level) setLevel(newLevel);
      setBestScore(bs => {
        const updated = Math.max(bs, ns);
        try { localStorage.setItem('jd_best', String(updated)); } catch {}
        return updated;
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
      next.push(randomTile());
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
      const newLevel = Math.floor(ns / LEVEL_THRESHOLD) + 1;
      if (newLevel !== level) setLevel(newLevel);
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
      next.push(randomTile());
      return next;
    });
    setScore(prev => {
      const ns = Math.max(0, prev - 10);
      const newLevel = Math.floor(ns / LEVEL_THRESHOLD) + 1;
      if (newLevel !== level) setLevel(newLevel);
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
