import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './FlashDriveManager.css';

const FlashDriveManager = () => {
  const [drives, setDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const [extractionStatus, setExtractionStatus] = useState('idle');
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [extractionResults, setExtractionResults] = useState(null);
  const [extractionHistory, setExtractionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Options for extraction
  const [extractionOptions, setExtractionOptions] = useState({
    convertToWav: true,
    generateWaveform: true,
    createPreview: true,
    extractMetadata: true,
    batchSize: 3,
    makePublic: false,
    defaultStatus: 'draft'
  });

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    extensions: [],
    namePattern: '',
    directories: []
  });

  useEffect(() => {
    loadExtractionHistory();
  }, []);

  const scanForDrives = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/flash-drive/scan', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDrives(data.data.drives);
        if (data.data.drives.length === 0) {
          setError('No removable drives found. Please insert a flash drive and try again.');
        }
      } else {
        setError(data.message || 'Failed to scan for drives');
      }
    } catch (error) {
      setError('Error scanning for drives: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const previewDrive = async (drivePath) => {
    setIsLoading(true);
    setError(null);
    setAudioFiles([]);
    
    try {
      const response = await fetch('/api/flash-drive/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ drivePath, maxDepth: 5 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAudioFiles(data.data.filesByDirectory);
        setSelectedDrive(drivePath);
      } else {
        setError(data.message || 'Failed to preview drive');
      }
    } catch (error) {
      setError('Error previewing drive: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startExtraction = async () => {
    if (!selectedDrive) {
      setError('Please select a drive first');
      return;
    }

    setExtractionStatus('extracting');
    setError(null);
    setProgress({ completed: 0, total: 0, percentage: 0 });
    
    try {
      const filter = {};
      if (filterOptions.extensions.length > 0) {
        filter.extensions = filterOptions.extensions;
      }
      if (filterOptions.namePattern) {
        filter.namePattern = filterOptions.namePattern;
      }
      if (filterOptions.directories.length > 0) {
        filter.directories = filterOptions.directories;
      }

      const response = await fetch('/api/flash-drive/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          drivePath: selectedDrive,
          options: extractionOptions,
          filter: Object.keys(filter).length > 0 ? filter : null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setExtractionResults(data.data);
        setExtractionStatus('completed');
        loadExtractionHistory();
      } else {
        setError(data.message || 'Extraction failed');
        setExtractionStatus('failed');
      }
    } catch (error) {
      setError('Error during extraction: ' + error.message);
      setExtractionStatus('failed');
    }
  };

  const importTracks = async () => {
    if (!extractionResults || !extractionResults.trackEntries) {
      setError('No tracks to import');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/flash-drive/import-tracks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          trackEntries: extractionResults.trackEntries,
          defaultStatus: extractionOptions.defaultStatus,
          makePublic: extractionOptions.makePublic
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully imported ${data.data.imported} tracks!`);
        // Reset extraction results after import
        setExtractionResults(null);
        setExtractionStatus('idle');
      } else {
        setError(data.message || 'Import failed');
      }
    } catch (error) {
      setError('Error importing tracks: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExtractionHistory = async () => {
    try {
      const response = await fetch('/api/flash-drive/extraction-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setExtractionHistory(data.data.history);
      }
    } catch (error) {
      console.error('Error loading extraction history:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flash-drive-manager">
      <div className="manager-header">
        <h1>🔌 Flash Drive Audio Extractor</h1>
        <p>Extract, process, and import WAV audio files from flash drives</p>
      </div>

      {error && (
        <motion.div 
          className="error-message"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="error-icon">⚠️</span>
          {error}
        </motion.div>
      )}

      {/* Drive Scanner */}
      <div className="drive-scanner">
        <div className="section-header">
          <h2>📱 Available Drives</h2>
          <button 
            onClick={scanForDrives} 
            disabled={isLoading}
            className="scan-button"
          >
            {isLoading ? '🔄 Scanning...' : '🔍 Scan for Drives'}
          </button>
        </div>

        <div className="drives-grid">
          {drives.map((drive, index) => (
            <motion.div
              key={drive.letter}
              className={`drive-card ${selectedDrive === drive.path ? 'selected' : ''}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => previewDrive(drive.path)}
            >
              <div className="drive-icon">💾</div>
              <div className="drive-info">
                <h3>{drive.letter}</h3>
                <p>{drive.label}</p>
                <span className="drive-type">
                  {drive.isRemovable ? 'Removable' : 'Fixed'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Audio Files Preview */}
      {Object.keys(audioFiles).length > 0 && (
        <div className="audio-preview">
          <h2>🎵 Audio Files Found</h2>
          <div className="files-summary">
            <span>Total Files: {Object.values(audioFiles).flat().length}</span>
            <span>Directories: {Object.keys(audioFiles).length}</span>
          </div>

          <div className="directories-list">
            {Object.entries(audioFiles).map(([directory, files]) => (
              <motion.div
                key={directory}
                className="directory-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h3>📁 {directory}</h3>
                <div className="files-grid">
                  {files.slice(0, 10).map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-icon">🎵</span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-extension">{file.extension}</span>
                    </div>
                  ))}
                  {files.length > 10 && (
                    <div className="more-files">
                      +{files.length - 10} more files...
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Extraction Options */}
      {selectedDrive && Object.keys(audioFiles).length > 0 && (
        <div className="extraction-options">
          <h2>⚙️ Extraction Options</h2>
          
          <div className="options-grid">
            <div className="option-group">
              <h3>Processing Options</h3>
              <label>
                <input
                  type="checkbox"
                  checked={extractionOptions.convertToWav}
                  onChange={(e) => setExtractionOptions(prev => ({
                    ...prev,
                    convertToWav: e.target.checked
                  }))}
                />
                Convert to WAV
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={extractionOptions.generateWaveform}
                  onChange={(e) => setExtractionOptions(prev => ({
                    ...prev,
                    generateWaveform: e.target.checked
                  }))}
                />
                Generate Waveforms
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={extractionOptions.createPreview}
                  onChange={(e) => setExtractionOptions(prev => ({
                    ...prev,
                    createPreview: e.target.checked
                  }))}
                />
                Create Preview Clips
              </label>
            </div>

            <div className="option-group">
              <h3>Import Settings</h3>
              <label>
                Track Status:
                <select
                  value={extractionOptions.defaultStatus}
                  onChange={(e) => setExtractionOptions(prev => ({
                    ...prev,
                    defaultStatus: e.target.value
                  }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="review">Under Review</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={extractionOptions.makePublic}
                  onChange={(e) => setExtractionOptions(prev => ({
                    ...prev,
                    makePublic: e.target.checked
                  }))}
                />
                Make Public
              </label>
            </div>
          </div>

          <button 
            onClick={startExtraction}
            disabled={extractionStatus === 'extracting' || isLoading}
            className="extract-button"
          >
            {extractionStatus === 'extracting' ? '🔄 Extracting...' : '🚀 Start Extraction'}
          </button>
        </div>
      )}

      {/* Extraction Progress */}
      {extractionStatus === 'extracting' && (
        <motion.div 
          className="extraction-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2>⏳ Extraction in Progress</h2>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p>{progress.completed} / {progress.total} files ({progress.percentage}%)</p>
        </motion.div>
      )}

      {/* Extraction Results */}
      {extractionResults && extractionStatus === 'completed' && (
        <motion.div 
          className="extraction-results"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>✅ Extraction Complete</h2>
          
          <div className="results-summary">
            <div className="stat-card">
              <h3>{extractionResults.successfulFiles}</h3>
              <p>Successful</p>
            </div>
            <div className="stat-card">
              <h3>{extractionResults.failedFiles}</h3>
              <p>Failed</p>
            </div>
            <div className="stat-card">
              <h3>{extractionResults.trackEntries.length}</h3>
              <p>Ready to Import</p>
            </div>
          </div>

          {extractionResults.trackEntries.length > 0 && (
            <div className="tracks-preview">
              <h3>🎵 Tracks Ready for Import</h3>
              <div className="tracks-list">
                {extractionResults.trackEntries.slice(0, 5).map((track, index) => (
                  <div key={index} className="track-preview">
                    <div className="track-info">
                      <h4>{track.title}</h4>
                      <p>{track.artist.name}</p>
                      <span>{formatDuration(track.audioFile.duration)}</span>
                    </div>
                    <div className="track-metadata">
                      <span>{track.genre.join(', ')}</span>
                      <span>{formatFileSize(track.audioFile.size)}</span>
                    </div>
                  </div>
                ))}
                {extractionResults.trackEntries.length > 5 && (
                  <p>+{extractionResults.trackEntries.length - 5} more tracks...</p>
                )}
              </div>

              <button 
                onClick={importTracks}
                disabled={isLoading}
                className="import-button"
              >
                {isLoading ? '📥 Importing...' : '📥 Import All Tracks'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Extraction History */}
      {extractionHistory.length > 0 && (
        <div className="extraction-history">
          <h2>📋 Recent Extractions</h2>
          <div className="history-list">
            {extractionHistory.slice(0, 5).map((entry, index) => (
              <motion.div
                key={entry.filename}
                className="history-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="history-info">
                  <h4>{new Date(entry.timestamp).toLocaleDateString()}</h4>
                  <p>{entry.source}</p>
                </div>
                <div className="history-stats">
                  <span>{entry.successful} successful</span>
                  <span>{entry.failed} failed</span>
                  <span>{entry.summary.successRate}% success rate</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashDriveManager;