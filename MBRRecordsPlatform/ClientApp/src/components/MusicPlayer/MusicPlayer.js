import React, { useState } from 'react';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
      background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      zIndex: 1000
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        color: '#ffffff'
      }}>
        <button style={{
          background: '#ff6b35',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          color: 'white',
          cursor: 'pointer'
        }}>
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
            {currentTrack?.title || 'No track selected'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#b0b0b0' }}>
            {currentTrack?.artist || 'Select a track to play'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;