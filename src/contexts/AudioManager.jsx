import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const SFX_FILES = {
  bg: '/assets/sfx/bg-music.mp3',
  drop: '/assets/sfx/drop.wav',
  click: '/assets/sfx/click.wav',
  trash: '/assets/sfx/trash.wav',
  gameover: '/assets/sfx/gameover.wav',
};

const SAVE_KEY = 'jd_bg_time_v1';
const MUTED_KEY = 'jd_muted';
const VOLUME_KEY = 'jd_volume';
const MUSIC_ENABLED_KEY = 'jd_music_enabled';

const AudioContextApp = createContext(null);

export function AudioProvider({ children }) {
  const bgAudioRef = useRef(null);
  const loadPromises = useRef({});
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
    try { return localStorage.getItem(MUSIC_ENABLED_KEY) !== 'false'; } catch { return true; }
  });

  const [bgMusicPlaying, setBgMusicPlaying] = useState(false);

  useEffect(() => { try { localStorage.setItem(MUTED_KEY, muted ? 'true' : 'false'); } catch {} }, [muted]);
  useEffect(() => { try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch {} }, [volume]);
  useEffect(() => { try { localStorage.setItem(MUSIC_ENABLED_KEY, musicEnabled ? 'true' : 'false'); } catch {} }, [musicEnabled]);

  function restorePositionIfAny(audio) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const v = parseFloat(raw);
      if (!Number.isFinite(v) || v <= 0) return;
      if (typeof audio.duration === 'number' && !Number.isNaN(audio.duration) && audio.duration > 0 && v >= audio.duration) return;
      try { audio.currentTime = v; } catch (e) {}
    } catch (e) {}
  }

  function loadBg() {
    if (loadPromises.current.bg) return loadPromises.current.bg;

    loadPromises.current.bg = new Promise((resolve) => {
      try {
        const a = new Audio();
        a.src = SFX_FILES.bg;
        a.preload = 'auto';

        try { a.muted = true; } catch (e) {}
        try { a.volume = 0; } catch (e) {}

        const onCan = () => {
          a.removeEventListener('canplaythrough', onCan);
          bgAudioRef.current = a;
          restorePositionIfAny(a);
          resolve(a);
        };
        const onErr = () => {
          a.removeEventListener('error', onErr);
          console.warn('Failed to load bg audio', SFX_FILES.bg);
          bgAudioRef.current = a;
          restorePositionIfAny(a);
          resolve(a);
        };

        a.addEventListener('canplaythrough', onCan);
        a.addEventListener('error', onErr);

        setTimeout(() => {
          if (!bgAudioRef.current) {
            bgAudioRef.current = a;
            restorePositionIfAny(a);
            resolve(a);
          }
        }, 1800);

        try { a.load(); } catch (err) {}

        try { a.play()?.catch(() => {}); } catch (e) {}
      } catch (err) {
        console.warn('loadBg err', err);
        resolve(null);
      }
    });

    return loadPromises.current.bg;
  }

  function playSfxOnce(path, vol = 0.9) {
    try {
      if (muted) return;
      const a = new Audio(path);
      a.preload = 'auto';
      a.volume = Math.max(0, Math.min(1, vol * volume));
      a.play?.().catch(() => {});
    } catch (err) { console.warn('playSfxOnce error', err); }
  }

  async function playSound(key, opts = {}) {
    if (muted) {
      // still allow limited SFX? we return to respect mute
      return;
    }
    if (!SFX_FILES[key]) return;

    if (key === 'bg') {
      if (!musicEnabled) return;
      const audio = await loadBg();
      if (!audio) return;

      try {
        if (opts.restart) {
          audio.pause();
          try { audio.currentTime = 0; } catch {}
        }

        audio.loop = true;

        if (!gestureDone.current) {
          try {
            audio.muted = false;
            audio.volume = muted ? 0 : (volume * 0.5);
            const p = audio.play();
            if (p !== undefined) {
              await p.catch(() => {});
              if (!audio.paused) {
                gestureDone.current = true;
                setBgMusicPlaying(true);
                return;
              }
            }
          } catch (_) {}

          try {
            audio.muted = true;
            audio.volume = 0;
            const q = audio.play();
            if (q !== undefined) {
              await q.catch(() => {});
            }
            bgAudioRef.current = audio;
            setBgMusicPlaying(!audio.paused && !audio.muted);
            return;
          } catch (err) {
            console.warn('muted autoplay failed', err);
            return;
          }
        } else {
          audio.muted = muted;
          audio.volume = muted ? 0 : (volume * 0.5);
          audio.play()?.catch(() => {});
          setBgMusicPlaying(!audio.paused && !audio.muted);
        }
      } catch (err) {
        console.warn('bg play error', err);
      }
      return;
    }

    playSfxOnce(SFX_FILES[key], 0.9);
  }

  function ensureBackgroundPlays() {
    if (gestureDone.current) return;
    gestureDone.current = true;

    const a = bgAudioRef.current || document.getElementById('bg-audio-fallback');
    if (a) {
      try {
        a.muted = false;
        a.volume = muted ? 0 : (volume * 0.5);
        a.play?.().catch(() => {});
        setBgMusicPlaying(!a.paused && !a.muted);
      } catch (e) {
        console.warn('ensureBackgroundPlays error', e);
      }
    } else {
      playSound('bg', { restart: true });
    }
  }

  function pauseBackgroundMusic() {
    const a = bgAudioRef.current;
    if (a && !a.paused) {
      try { a.pause(); } catch (e) {}
      setBgMusicPlaying(false);
    }
  }

  function resumeBackgroundMusic() {
    const a = bgAudioRef.current;
    if (a && a.paused && musicEnabled && !muted) {
      try { a.play?.().catch(() => {}); } catch (e) {}
      setBgMusicPlaying(!a.paused && !a.muted);
    }
  }

  async function forceStartBackgroundMusic() {
    const audio = await loadBg();
    if (!audio) return;
    try {
      audio.muted = false;
      audio.volume = muted ? 0 : (volume * 0.5);
      audio.loop = true;
      audio.play?.().catch(() => {});
      gestureDone.current = true;
      setBgMusicPlaying(!audio.paused && !audio.muted);
    } catch (e) { console.warn('forceStartBackgroundMusic error', e); }
  }

  useEffect(() => {
    let id = null;
    function saveTime() {
      try {
        const a = bgAudioRef.current;
        if (a && !a.paused && typeof a.currentTime === 'number') {
          localStorage.setItem(SAVE_KEY, String(a.currentTime || 0));
        }
      } catch (e) {}
    }
    id = setInterval(saveTime, 1000);
    function onBeforeUnload() {
      try {
        const a = bgAudioRef.current;
        if (a && typeof a.currentTime === 'number') {
          localStorage.setItem(SAVE_KEY, String(a.currentTime || 0));
        }
      } catch (e) {}
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
          const p = audio.play();
          if (p !== undefined) await p.catch(() => {});
          if (!audio.paused) {
            gestureDone.current = true;
            setBgMusicPlaying(true);
            return;
          }
        } catch (_) {}

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
        if (!musicEnabled && !a.paused) a.pause();
        else if (musicEnabled && a.paused && gestureDone.current && !muted) a.play?.().catch(() => {});
      } catch (e) { }
      setBgMusicPlaying(!!(a && !a.paused && !a.muted && musicEnabled && !muted));
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
