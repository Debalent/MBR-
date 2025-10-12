import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Howl } from 'howler';

const AudioContext = createContext();

// Audio player state
const initialState = {
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.7,
  isRepeat: false,
  isShuffle: false,
  queue: [],
  currentIndex: 0,
  howl: null,
  isLoading: false,
  error: null
};

// Audio player actions
const audioReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CURRENT_TRACK':
      return {
        ...state,
        currentTrack: action.payload,
        progress: 0,
        isLoading: true
      };
    
    case 'SET_PLAYING':
      return {
        ...state,
        isPlaying: action.payload
      };
    
    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.payload
      };
    
    case 'SET_DURATION':
      return {
        ...state,
        duration: action.payload
      };
    
    case 'SET_VOLUME':
      return {
        ...state,
        volume: action.payload
      };
    
    case 'TOGGLE_REPEAT':
      return {
        ...state,
        isRepeat: !state.isRepeat
      };
    
    case 'TOGGLE_SHUFFLE':
      return {
        ...state,
        isShuffle: !state.isShuffle
      };
    
    case 'SET_QUEUE':
      return {
        ...state,
        queue: action.payload
      };
    
    case 'SET_CURRENT_INDEX':
      return {
        ...state,
        currentIndex: action.payload
      };
    
    case 'SET_HOWL':
      return {
        ...state,
        howl: action.payload,
        isLoading: false
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    default:
      return state;
  }
};

export const AudioContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(audioReducer, initialState);

  // Initialize audio player
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (state.howl) {
        state.howl.unload();
      }
    };
  }, []);

  // Update progress when playing
  useEffect(() => {
    let interval;
    
    if (state.isPlaying && state.howl) {
      interval = setInterval(() => {
        const seek = state.howl.seek();
        if (typeof seek === 'number') {
          dispatch({ type: 'SET_PROGRESS', payload: seek });
        }
      }, 100);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.isPlaying, state.howl]);

  // Load and play track
  const loadTrack = (track) => {
    // Stop current track
    if (state.howl) {
      state.howl.unload();
    }

    dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
    dispatch({ type: 'SET_LOADING', payload: true });

    // Create new Howl instance
    const howl = new Howl({
      src: [track.audioUrl],
      html5: true,
      volume: state.volume,
      onload: () => {
        const duration = howl.duration();
        dispatch({ type: 'SET_DURATION', payload: duration });
        dispatch({ type: 'SET_LOADING', payload: false });
      },
      onplay: () => {
        dispatch({ type: 'SET_PLAYING', payload: true });
      },
      onpause: () => {
        dispatch({ type: 'SET_PLAYING', payload: false });
      },
      onend: () => {
        dispatch({ type: 'SET_PLAYING', payload: false });
        dispatch({ type: 'SET_PROGRESS', payload: 0 });
        
        // Auto-play next track
        if (state.isRepeat) {
          howl.seek(0);
          howl.play();
        } else {
          nextTrack();
        }
      },
      onloaderror: (id, error) => {
        dispatch({ type: 'SET_ERROR', payload: `Failed to load audio: ${error}` });
      },
      onplayerror: (id, error) => {
        dispatch({ type: 'SET_ERROR', payload: `Playback error: ${error}` });
      }
    });

    dispatch({ type: 'SET_HOWL', payload: howl });
  };

  // Play current track
  const play = () => {
    if (state.howl && !state.isPlaying) {
      state.howl.play();
    }
  };

  // Pause current track
  const pause = () => {
    if (state.howl && state.isPlaying) {
      state.howl.pause();
    }
  };

  // Stop current track
  const stop = () => {
    if (state.howl) {
      state.howl.stop();
      dispatch({ type: 'SET_PLAYING', payload: false });
      dispatch({ type: 'SET_PROGRESS', payload: 0 });
    }
  };

  // Set progress
  const setProgress = (time) => {
    if (state.howl) {
      state.howl.seek(time);
      dispatch({ type: 'SET_PROGRESS', payload: time });
    }
  };

  // Set volume
  const setVolume = (volume) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
    if (state.howl) {
      state.howl.volume(volume);
    }
  };

  // Toggle repeat
  const toggleRepeat = () => {
    dispatch({ type: 'TOGGLE_REPEAT' });
  };

  // Toggle shuffle
  const toggleShuffle = () => {
    dispatch({ type: 'TOGGLE_SHUFFLE' });
  };

  // Play next track
  const nextTrack = () => {
    if (state.queue.length === 0) return;

    let nextIndex;
    
    if (state.isShuffle) {
      // Random track
      do {
        nextIndex = Math.floor(Math.random() * state.queue.length);
      } while (nextIndex === state.currentIndex && state.queue.length > 1);
    } else {
      // Next track in order
      nextIndex = (state.currentIndex + 1) % state.queue.length;
    }

    dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
    loadTrack(state.queue[nextIndex]);
  };

  // Play previous track
  const previousTrack = () => {
    if (state.queue.length === 0) return;

    let prevIndex;
    
    if (state.progress > 3) {
      // If more than 3 seconds played, restart current track
      setProgress(0);
      return;
    }

    if (state.isShuffle) {
      // Random track
      do {
        prevIndex = Math.floor(Math.random() * state.queue.length);
      } while (prevIndex === state.currentIndex && state.queue.length > 1);
    } else {
      // Previous track in order
      prevIndex = state.currentIndex === 0 ? state.queue.length - 1 : state.currentIndex - 1;
    }

    dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex });
    loadTrack(state.queue[prevIndex]);
  };

  // Set queue and play track
  const playTrack = (track, queue = [track], index = 0) => {
    dispatch({ type: 'SET_QUEUE', payload: queue });
    dispatch({ type: 'SET_CURRENT_INDEX', payload: index });
    loadTrack(track);
  };

  // Add track to queue
  const addToQueue = (track) => {
    const newQueue = [...state.queue, track];
    dispatch({ type: 'SET_QUEUE', payload: newQueue });
  };

  // Remove track from queue
  const removeFromQueue = (index) => {
    const newQueue = state.queue.filter((_, i) => i !== index);
    dispatch({ type: 'SET_QUEUE', payload: newQueue });
    
    // Adjust current index if necessary
    if (index < state.currentIndex) {
      dispatch({ type: 'SET_CURRENT_INDEX', payload: state.currentIndex - 1 });
    } else if (index === state.currentIndex && newQueue.length > 0) {
      // If current track was removed, play next track
      const nextIndex = Math.min(state.currentIndex, newQueue.length - 1);
      dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
      loadTrack(newQueue[nextIndex]);
    }
  };

  // Clear queue
  const clearQueue = () => {
    stop();
    dispatch({ type: 'SET_QUEUE', payload: [] });
    dispatch({ type: 'SET_CURRENT_INDEX', payload: 0 });
    dispatch({ type: 'SET_CURRENT_TRACK', payload: null });
  };

  const value = {
    // State
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    progress: state.progress,
    duration: state.duration,
    volume: state.volume,
    isRepeat: state.isRepeat,
    isShuffle: state.isShuffle,
    queue: state.queue,
    currentIndex: state.currentIndex,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    play,
    pause,
    stop,
    playTrack,
    nextTrack,
    previousTrack,
    setProgress,
    setVolume,
    toggleRepeat,
    toggleShuffle,
    addToQueue,
    removeFromQueue,
    clearQueue
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudioContext = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioContextProvider');
  }
  return context;
};