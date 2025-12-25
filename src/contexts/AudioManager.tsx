import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const SFX_FILES: Record<string, string> = {
  drop: '/assets/sfx/drop.wav',
  click: '/assets/sfx/click.wav',
  trash: '/assets/sfx/trash.wav',
  gameover: '/assets/sfx/gameover.wav',
  bg: '/assets/sfx/background.mp3', // Added background music
};

const SAVE_KEY = 'jd_bg_time_v1';
const MUTED_KEY = 'jd_muted';
const VOLUME_KEY = 'jd_volume';
const MUSIC_ENABLED_KEY = 'jd_music_enabled';

interface AudioAPI {
  playSound: (key: string, opts?: { restart?: boolean }) => Promise<void> | void;
  ensureBackgroundPlays: () => void;
  pauseBackgroundMusic: () => void;
  resumeBackgroundMusic: () => void;
  muted: boolean;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  volume: number;
  musicEnabled: boolean;
  toggleMusicEnabled: () => void;
  bgMusicPlaying: boolean;
  forceStartBackgroundMusic: () => Promise<void> | void;
  _getSavedTime: () => number;
}

const AudioContextApp = createContext<AudioAPI | null>(null);

interface AudioProviderProps {
  children: React.ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadPromises = useRef<{ bg?: Promise<HTMLAudioElement | null> }>({});
  const gestureDone = useRef(false);

  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTED_KEY) === 'true'; } catch { return false; }
  });
  const [volume, setVolume] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(VOLUME_KEY));
      return Number.isFinite(v) ? v : 0.8;
    } catch { return 0.8; }
  });
  const [musicEnabled, setMusicEnabled] = useState(() => {
    try { return localStorage.getItem(MUSIC_ENABLED_KEY) === 'true'; } catch { return true; } // Default to true if not set
  });

  const [bgMusicPlaying, setBgMusicPlaying] = useState(false);

  useEffect(() => { try { localStorage.setItem(MUTED_KEY, muted ? 'true' : 'false'); } catch { } }, [muted]);
  useEffect(() => { try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { } }, [volume]);
  useEffect(() => { try { localStorage.setItem(MUSIC_ENABLED_KEY, musicEnabled ? 'true' : 'false'); } catch { } }, [musicEnabled]);

  function restorePositionIfAny(audio: HTMLAudioElement) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v <= 0) return;
      if (typeof audio.duration === 'number' && !Number.isNaN(audio.duration) && audio.duration > 0 && v >= audio.duration) return;
      try { audio.currentTime = v; } catch (e) { }
    } catch (e) { }
  }

  function loadBg() {
    if (bgAudioRef.current) return Promise.resolve(bgAudioRef.current);
    if (loadPromises.current.bg) return loadPromises.current.bg;

    const p = new Promise<HTMLAudioElement | null>((resolve) => {
      const audio = new Audio(SFX_FILES.bg);
      audio.loop = true;
      audio.volume = muted ? 0 : (volume * 0.5);

      const onCanPlay = () => {
        bgAudioRef.current = audio;
        restorePositionIfAny(audio);
        resolve(audio);
      };

      const onError = (e: any) => {
        console.warn('Background audio failed to load', e);
        resolve(null);
      };

      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });

      // Fallback if event doesn't fire quickly
      setTimeout(() => {
        if (!bgAudioRef.current) {
          // Try resolving anyway if readyState satisfies
          if (audio.readyState >= 3) {
            bgAudioRef.current = audio;
            restorePositionIfAny(audio);
            resolve(audio);
          }
        }
      }, 2000);

      audio.load();
    });

    loadPromises.current.bg = p;
    return p;
  }

  function playSfxOnce(path: string, vol: number = 0.9) {
    try {
      if (muted) return;
      const a = new Audio(path);
      a.preload = 'auto';
      a.volume = Math.max(0, Math.min(1, vol * volume));
      a.play?.().catch(() => { });
    } catch (err) { console.warn('playSfxOnce error', err); }
  }

  async function playSound(key: string, opts: { restart?: boolean } = {}) {
    if (muted && key !== 'bg') {
      // still allow limited SFX? we return to respect mute
      return;
    }
    if (!SFX_FILES[key]) return;

    if (key === 'bg') {
      if (!musicEnabled) return;
      const audio = await loadBg();
      if (!audio) return;
      if (opts.restart) {
        audio.currentTime = 0;
      }
      try {
        audio.volume = muted ? 0 : (volume * 0.5);
        const p = audio.play();
        if (p !== undefined) await p.catch(() => { });
        setBgMusicPlaying(!audio.paused);
      } catch (e) { }
      return;
    }

    playSfxOnce(SFX_FILES[key], 0.9);
  }

  function ensureBackgroundPlays() {
    if (!musicEnabled || muted) return; // Don't force play if disabled
    loadBg().then((audio) => {
      if (!audio) return;
      if (audio.paused) {
        audio.volume = muted ? 0 : (volume * 0.5);
        audio.play().then(() => {
          gestureDone.current = true;
          setBgMusicPlaying(true);
        }).catch(() => { });
      }
    });
  }

  function pauseBackgroundMusic() {
    const a = bgAudioRef.current;
    if (a && !a.paused) {
      try { a.pause(); } catch (e) { }
      setBgMusicPlaying(false);
    }
  }

  function resumeBackgroundMusic() {
    const a = bgAudioRef.current;
    if (a && a.paused && musicEnabled && !muted) {
      try { a.play?.().catch(() => { }); } catch (e) { }
      setBgMusicPlaying(!a.paused && !a.muted);
    }
  }

  async function forceStartBackgroundMusic() {
    if (!musicEnabled) return;
    const audio = await loadBg();
    if (audio && (audio.paused || audio.ended)) {
      try {
        audio.volume = muted ? 0 : (volume * 0.5);
        await audio.play();
        gestureDone.current = true;
        setBgMusicPlaying(true);
      } catch (e) {
        console.log('Force start failed (interaction likely needed)', e);
      }
    }
  }

  useEffect(() => {
    let id: any = null;
    function saveTime() {
      try {
        const a = bgAudioRef.current;
        if (a && !a.paused && typeof a.currentTime === 'number') {
          localStorage.setItem(SAVE_KEY, String(a.currentTime || 0));
        }
      } catch (e) { }
    }
    id = setInterval(saveTime, 1000);
    function onBeforeUnload() {
      try {
        const a = bgAudioRef.current;
        if (a && typeof a.currentTime === 'number') {
          localStorage.setItem(SAVE_KEY, String(a.currentTime || 0));
        }
      } catch (e) { }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      if (!musicEnabled) return;
      try {
        const audio = await loadBg();
        if (!audio) return;
        audio.loop = true;

        try {
          audio.muted = false;
          audio.volume = muted ? 0 : (volume * 0.5);
          // Try to play immediately (sometimes works on desktop refs)
          if (!audio.paused) return; // already playing

          const p = audio.play();
          if (p !== undefined) await p.catch(() => { });
          if (!audio.paused) {
            gestureDone.current = true;
            setBgMusicPlaying(true);
            return;
          }
        } catch (_) { }

      } catch (err) {
        console.warn('autoplay attempt error', err);
      }
    })();

    function onFirstUserGesture() {
      ensureBackgroundPlays();
      window.removeEventListener('pointerdown', onFirstUserGesture);
      window.removeEventListener('click', onFirstUserGesture);
      window.removeEventListener('keydown', onFirstUserGesture);
      window.removeEventListener('touchstart', onFirstUserGesture);
    }

    window.addEventListener('pointerdown', onFirstUserGesture, { once: true });
    window.addEventListener('click', onFirstUserGesture, { once: true });
    window.addEventListener('keydown', onFirstUserGesture, { once: true });
    window.addEventListener('touchstart', onFirstUserGesture, { once: true });

    return () => {
      mounted = false;
      window.removeEventListener('pointerdown', onFirstUserGesture);
      window.removeEventListener('click', onFirstUserGesture);
      window.removeEventListener('keydown', onFirstUserGesture);
      window.removeEventListener('touchstart', onFirstUserGesture);
    };
  }, [musicEnabled]);

  useEffect(() => {
    const a = bgAudioRef.current;
    if (a) {
      try {
        a.volume = muted ? 0 : (volume * 0.5);
        if ((!musicEnabled || muted) && !a.paused) {
          a.pause();
          setBgMusicPlaying(false);
        } else if (musicEnabled && !muted && a.paused && gestureDone.current) {
          a.play?.().catch(() => { });
          setBgMusicPlaying(true);
        }
      } catch (e) { }
    }
  }, [muted, volume, musicEnabled]);

  const api = {
    playSound,
    ensureBackgroundPlays,
    pauseBackgroundMusic,
    resumeBackgroundMusic,
    muted,
    toggleMute: () => setMuted(m => !m),
    setVolume: (v) => setVolume(Math.max(0, Math.min(1, Number(v) || 0.8))),
    volume,
    musicEnabled,
    toggleMusicEnabled: () => setMusicEnabled(v => !v),
    bgMusicPlaying,
    forceStartBackgroundMusic,
    _getSavedTime: () => {
      try { return parseFloat(localStorage.getItem(SAVE_KEY) || '0'); } catch { return 0; }
    },
  };

  return (
    <AudioContextApp.Provider value={api}>
      {children}
    </AudioContextApp.Provider>
  );
}

export function useAudio() { return useContext(AudioContextApp); }
