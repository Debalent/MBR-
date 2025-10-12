import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import './AdvancedMusicPlayer.css';

const AdvancedMusicPlayer = () => {
  // Player state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Queue and playlist state
  const [queue, setQueue] = useState([]);
  const [originalQueue, setOriginalQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playHistory, setPlayHistory] = useState([]);
  
  // Audio visualization
  const [isVisualizerEnabled, setIsVisualizerEnabled] = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  
  // Refs
  const howlRef = useRef(null);
  const progressRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize Howler settings
  useEffect(() => {
    Howler.volume(volume);
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
    };
  }, []);

  // Load and play track
  const loadTrack = useCallback((track, autoPlay = false) => {
    if (howlRef.current) {
      howlRef.current.unload();
    }

    const sound = new Howl({
      src: [track.audioUrl],
      html5: true,
      preload: true,
      volume: volume,
      onload: () => {
        setDuration(sound.duration());
        setCurrentTrack(track);
        if (autoPlay) {
          sound.play();
          setIsPlaying(true);
        }
      },
      onplay: () => {
        setIsPlaying(true);
        updateProgress();
      },
      onpause: () => {
        setIsPlaying(false);
      },
      onstop: () => {
        setIsPlaying(false);
        setProgress(0);
      },
      onend: () => {
        handleTrackEnd();
      },
      onerror: (id, error) => {
        console.error('Audio error:', error);
        handleNextTrack();
      }
    });

    howlRef.current = sound;
  }, [volume]);

  // Update progress
  const updateProgress = useCallback(() => {
    if (howlRef.current && isPlaying) {
      const seek = howlRef.current.seek();
      setProgress(seek);
      
      if (isVisualizerEnabled) {
        updateVisualizer();
      }
      
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, isVisualizerEnabled]);

  // Handle track end
  const handleTrackEnd = useCallback(() => {
    if (repeatMode === 'one') {
      howlRef.current?.seek(0);
      howlRef.current?.play();
    } else {
      handleNextTrack();
    }
  }, [repeatMode]);

  // Play/Pause toggle
  const togglePlay = () => {
    if (!howlRef.current) return;

    if (isPlaying) {
      howlRef.current.pause();
      cancelAnimationFrame(animationRef.current);
    } else {
      howlRef.current.play();
    }
  };

  // Previous track
  const handlePreviousTrack = () => {
    if (progress > 3) {
      // If more than 3 seconds played, restart current track
      howlRef.current?.seek(0);
      return;
    }

    const newIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    setCurrentIndex(newIndex);
    loadTrack(queue[newIndex], isPlaying);
  };

  // Next track
  const handleNextTrack = () => {
    let newIndex;
    
    if (isShuffled) {
      // Random track from queue
      do {
        newIndex = Math.floor(Math.random() * queue.length);
      } while (newIndex === currentIndex && queue.length > 1);
    } else {
      // Sequential play
      newIndex = currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
      
      // If repeat mode is 'none' and we're at the end, stop
      if (repeatMode === 'none' && currentIndex === queue.length - 1) {
        howlRef.current?.stop();
        return;
      }
    }
    
    setCurrentIndex(newIndex);
    loadTrack(queue[newIndex], isPlaying);
  };

  // Seek to position
  const handleSeek = (e) => {
    if (!howlRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = duration * percent;
    
    howlRef.current.seek(seekTime);
    setProgress(seekTime);
  };

  // Volume control
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    Howler.volume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Mute toggle
  const toggleMute = () => {
    if (isMuted) {
      Howler.volume(volume);
      setIsMuted(false);
    } else {
      Howler.volume(0);
      setIsMuted(true);
    }
  };

  // Shuffle toggle
  const toggleShuffle = () => {
    if (!isShuffled) {
      setOriginalQueue([...queue]);
      const shuffled = [...queue];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setQueue(shuffled);
      setCurrentIndex(0);
    } else {
      setQueue(originalQueue);
      setCurrentIndex(originalQueue.findIndex(track => track.id === currentTrack?.id) || 0);
    }
    setIsShuffled(!isShuffled);
  };

  // Repeat mode toggle
  const toggleRepeat = () => {
    const modes = ['none', 'all', 'one'];
    const currentModeIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    setRepeatMode(nextMode);
  };

  // Add track to queue
  const addToQueue = (track) => {
    setQueue(prev => [...prev, track]);
  };

  // Remove from queue
  const removeFromQueue = (index) => {
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    
    if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (index === currentIndex) {
      if (newQueue.length > 0) {
        const nextIndex = index < newQueue.length ? index : 0;
        setCurrentIndex(nextIndex);
        loadTrack(newQueue[nextIndex], isPlaying);
      } else {
        setCurrentTrack(null);
        howlRef.current?.stop();
      }
    }
  };

  // Visualizer
  const updateVisualizer = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ff6b35');
    gradient.addColorStop(1, '#f7931e');
    
    // Draw waveform visualization
    const barWidth = width / waveformData.length;
    for (let i = 0; i < waveformData.length; i++) {
      const barHeight = (waveformData[i] / 255) * height;
      ctx.fillStyle = gradient;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`advanced-music-player ${isExpanded ? 'expanded' : ''}`}>
      {/* Mini Player */}
      <div className="player-mini" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="track-info">
          {currentTrack ? (
            <>
              <div className="track-artwork">
                <img src={currentTrack.artwork || '/assets/default-artwork.png'} alt={currentTrack.title} />
                {isPlaying && <div className="playing-indicator">♪</div>}
              </div>
              <div className="track-details">
                <div className="track-title">{currentTrack.title}</div>
                <div className="track-artist">{currentTrack.artist}</div>
              </div>
            </>
          ) : (
            <div className="no-track">Select a track to play</div>
          )}
        </div>
        
        <div className="player-controls-mini">
          <button onClick={(e) => { e.stopPropagation(); handlePreviousTrack(); }} className="control-btn">
            ⏮️
          </button>
          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="play-btn">
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleNextTrack(); }} className="control-btn">
            ⏭️
          </button>
        </div>
        
        <div className="progress-mini">
          <div 
            className="progress-bar"
            ref={progressRef}
            onClick={handleSeek}
          >
            <div 
              className="progress-fill"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Player */}
      {isExpanded && (
        <div className="player-expanded">
          <div className="player-header">
            <button onClick={() => setIsExpanded(false)} className="collapse-btn">
              ⬇️
            </button>
            <h3>Now Playing</h3>
            <button 
              onClick={() => setIsVisualizerEnabled(!isVisualizerEnabled)}
              className={`visualizer-btn ${isVisualizerEnabled ? 'active' : ''}`}
            >
              📊
            </button>
          </div>

          <div className="player-content">
            <div className="main-player">
              <div className="artwork-section">
                <div className="artwork-container">
                  <img 
                    src={currentTrack?.artwork || '/assets/default-artwork.png'} 
                    alt={currentTrack?.title || 'No track'}
                    className={isPlaying ? 'rotating' : ''}
                  />
                  {isVisualizerEnabled && (
                    <canvas 
                      ref={canvasRef}
                      className="visualizer"
                      width="300"
                      height="150"
                    />
                  )}
                </div>
              </div>

              <div className="track-info-expanded">
                <h2 className="track-title">{currentTrack?.title || 'No track selected'}</h2>
                <p className="track-artist">{currentTrack?.artist || 'Unknown Artist'}</p>
                <p className="track-album">{currentTrack?.album || ''}</p>
              </div>

              <div className="progress-section">
                <div className="time-display">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div 
                  className="progress-bar-expanded"
                  ref={progressRef}
                  onClick={handleSeek}
                >
                  <div 
                    className="progress-fill"
                    style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="player-controls-expanded">
                <button 
                  onClick={toggleShuffle}
                  className={`control-btn ${isShuffled ? 'active' : ''}`}
                >
                  🔀
                </button>
                
                <button onClick={handlePreviousTrack} className="control-btn">
                  ⏮️
                </button>
                
                <button onClick={togglePlay} className="play-btn-large">
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                
                <button onClick={handleNextTrack} className="control-btn">
                  ⏭️
                </button>
                
                <button 
                  onClick={toggleRepeat}
                  className={`control-btn ${repeatMode !== 'none' ? 'active' : ''}`}
                >
                  {repeatMode === 'one' ? '🔂' : '🔁'}
                </button>
              </div>

              <div className="volume-section">
                <button onClick={toggleMute} className="volume-btn">
                  {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="volume-slider"
                />
              </div>
            </div>

            {/* Queue */}
            <div className="queue-section">
              <h4>Queue ({queue.length} tracks)</h4>
              <div className="queue-list">
                {queue.map((track, index) => (
                  <div 
                    key={`${track.id}-${index}`}
                    className={`queue-item ${index === currentIndex ? 'current' : ''}`}
                    onClick={() => {
                      setCurrentIndex(index);
                      loadTrack(track, true);
                    }}
                  >
                    <div className="queue-track-info">
                      <img src={track.artwork || '/assets/default-artwork.png'} alt={track.title} />
                      <div>
                        <div className="queue-track-title">{track.title}</div>
                        <div className="queue-track-artist">{track.artist}</div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFromQueue(index); }}
                      className="remove-btn"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedMusicPlayer;