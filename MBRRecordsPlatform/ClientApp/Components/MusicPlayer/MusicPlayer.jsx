import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Shuffle,
  Heart,
  Share2,
  MoreHorizontal
} from 'lucide-react';
import { useAudioContext } from '../../contexts/AudioContext';

const PlayerContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-background-card);
  border-top: 1px solid var(--color-border-default);
  padding: var(--spacing-md);
  z-index: var(--z-fixed);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  @supports not (backdrop-filter: blur(20px)) {
    background: rgba(30, 30, 30, 0.95);
  }
`;

const PlayerContent = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: 767px) {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
`;

const TrackInfo = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
  flex: 1;
  
  @media (max-width: 767px) {
    width: 100%;
    justify-content: center;
  }
`;

const TrackArtwork = styled.img`
  width: 50px;
  height: 50px;
  border-radius: var(--radius-md);
  object-fit: cover;
  box-shadow: var(--shadow-md);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 767px) {
    width: 40px;
    height: 40px;
  }
`;

const TrackDetails = styled.div`
  min-width: 0;
  flex: 1;
`;

const TrackTitle = styled.h4`
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
`;

const TrackArtist = styled.p`
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PlayerControls = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 2;
  
  @media (max-width: 767px) {
    order: -1;
    width: 100%;
  }
`;

const ControlButtons = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
`;

const ControlButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: 50%;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: var(--color-text-primary);
    background: var(--color-background-light);
    transform: scale(1.1);
  }
  
  &.active {
    color: var(--color-primary-orange);
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
  
  &.play-pause {
    color: var(--color-primary-orange);
    background: rgba(255, 87, 34, 0.1);
    padding: var(--spacing-md);
    
    svg {
      width: 24px;
      height: 24px;
    }
    
    &:hover {
      background: rgba(255, 87, 34, 0.2);
      transform: scale(1.05);
    }
  }
`;

const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
  max-width: 600px;
`;

const ProgressTime = styled.span`
  font-size: 0.75rem;
  color: var(--color-text-muted);
  min-width: 40px;
  text-align: center;
  
  @media (max-width: 767px) {
    font-size: 0.7rem;
    min-width: 35px;
  }
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: var(--color-background-light);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    height: 6px;
    
    .progress-handle {
      opacity: 1;
    }
  }
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-orange), #1976d2);
  border-radius: 2px;
  transition: width 0.1s ease;
  position: relative;
`;

const ProgressHandle = styled.div`
  position: absolute;
  top: 50%;
  right: -6px;
  width: 12px;
  height: 12px;
  background: var(--color-primary-orange);
  border-radius: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.3s ease;
  box-shadow: var(--shadow-md);
  
  &.visible {
    opacity: 1;
  }
`;

const VolumeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 100px;
  
  @media (max-width: 767px) {
    display: none;
  }
`;

const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  background: var(--color-background-light);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--color-primary-orange);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.2);
    }
  }
  
  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--color-primary-orange);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.2);
    }
  }
`;

const TrackActions = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
  
  &:hover {
    color: var(--color-primary-orange);
    background: rgba(255, 87, 34, 0.1);
  }
  
  &.liked {
    color: var(--color-primary-orange);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

function MusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isRepeat,
    isShuffle,
    play,
    pause,
    previousTrack,
    nextTrack,
    setProgress,
    setVolume,
    toggleRepeat,
    toggleShuffle
  } = useAudioContext();

  const [isDragging, setIsDragging] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const progressBarRef = useRef(null);

  // Format time helper
  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = (e) => {
    if (progressBarRef.current && duration) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      setProgress(newTime);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Toggle mute
  const toggleMute = () => {
    if (isMuted) {
      setVolume(0.7);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Handle like toggle
  const handleLike = () => {
    setIsLiked(!isLiked);
    // TODO: API call to like/unlike track
  };

  // Handle share
  const handleShare = () => {
    if (currentTrack && navigator.share) {
      navigator.share({
        title: currentTrack.title,
        text: `Check out "${currentTrack.title}" by ${currentTrack.artist}`,
        url: window.location.href
      });
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <PlayerContainer>
      <PlayerContent>
        <TrackInfo>
          <TrackArtwork
            src={currentTrack.artwork || '/default-artwork.jpg'}
            alt={`${currentTrack.title} artwork`}
            onError={(e) => {
              e.target.src = '/default-artwork.jpg';
            }}
          />
          <TrackDetails>
            <TrackTitle>{currentTrack.title}</TrackTitle>
            <TrackArtist>{currentTrack.artist}</TrackArtist>
          </TrackDetails>
          <TrackActions>
            <ActionButton 
              className={isLiked ? 'liked' : ''}
              onClick={handleLike}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart fill={isLiked ? 'currentColor' : 'none'} />
            </ActionButton>
            <ActionButton onClick={handleShare} title="Share">
              <Share2 />
            </ActionButton>
            <ActionButton title="More options">
              <MoreHorizontal />
            </ActionButton>
          </TrackActions>
        </TrackInfo>

        <PlayerControls>
          <ControlButtons>
            <ControlButton 
              className={isShuffle ? 'active' : ''}
              onClick={toggleShuffle}
              title="Shuffle"
            >
              <Shuffle />
            </ControlButton>
            
            <ControlButton onClick={previousTrack} title="Previous">
              <SkipBack />
            </ControlButton>
            
            <ControlButton 
              className="play-pause"
              onClick={isPlaying ? pause : play}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause /> : <Play />}
            </ControlButton>
            
            <ControlButton onClick={nextTrack} title="Next">
              <SkipForward />
            </ControlButton>
            
            <ControlButton 
              className={isRepeat ? 'active' : ''}
              onClick={toggleRepeat}
              title="Repeat"
            >
              <Repeat />
            </ControlButton>
          </ControlButtons>

          <ProgressContainer>
            <ProgressTime>{formatTime(progress)}</ProgressTime>
            <ProgressBar ref={progressBarRef} onClick={handleProgressClick}>
              <ProgressFill 
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              >
                <ProgressHandle className="progress-handle" />
              </ProgressFill>
            </ProgressBar>
            <ProgressTime>{formatTime(duration)}</ProgressTime>
          </ProgressContainer>
        </PlayerControls>

        <VolumeContainer>
          <ControlButton onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </ControlButton>
          <VolumeSlider
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
          />
        </VolumeContainer>
      </PlayerContent>
    </PlayerContainer>
  );
}

export default MusicPlayer;