import React, { useEffect, useState } from 'react';
import { useAudio } from '../contexts/AudioManager';

interface MusicStarterProps {
  autoShow?: boolean;
}

export default function MusicStarter({ autoShow = true }: MusicStarterProps) {
  const audio = useAudio();
  const [visible, setVisible] = useState(autoShow);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If audio already playing/unmuted, hide immediately
    if (audio?.bgMusicPlaying) setVisible(false);
  }, [audio]);

  async function handleStart(e?: React.MouseEvent) {
    e?.stopPropagation?.();
    if (!audio) return;
    setLoading(true);

    try {
      // Preferred call: unmute & play the fallback audio or bg sound
      if (typeof audio.ensureBackgroundPlays === 'function') {
        audio.ensureBackgroundPlays();
      } else if (typeof audio.forceStartBackgroundMusic === 'function') {
        await audio.forceStartBackgroundMusic();
      } else if (typeof audio.playSound === 'function') {
        audio.playSound('bg', { restart: true });
      }

      // small delay so audio has time to start
      setTimeout(() => {
        setLoading(false);
        setVisible(false); // auto-hide after success attempt
      }, 450);
    } catch (err) {
      console.error('MusicStarter error', err);
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      onClick={handleStart}
      role="button"
      aria-label="Start audio"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.6))',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 'min(520px, 92%)',
          background: 'white',
          borderRadius: 12,
          padding: 22,
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Tap to enable audio</h2>
        <p style={{ marginTop: 8, marginBottom: 16, color: '#374151' }}>
          To hear background music during the game, tap the button below. This is required by browsers.
        </p>

        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: '#2563eb',
            color: 'white',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {loading ? 'Starting…' : 'Start Music'}
        </button>

        <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
          Tip: you can also tap anywhere on the game area to enable audio.
        </div>
      </div>
    </div>
  );
}
