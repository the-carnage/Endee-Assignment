import React from 'react';

const MicFooter = ({ status, docLoaded, onMicClick }) => {
  // status: 'idle' | 'ready' | 'recording' | 'processing' | 'speaking'

  const getStatusText = () => {
    switch(status) {
      case 'idle': return 'Choose a data source to begin';
      case 'ready': return 'Ready';
      case 'recording': return 'Recording...';
      case 'processing': return 'Transcribing...';
      case 'speaking': return 'Speaking...';
      default: return 'Ready';
    }
  };

  const isBtnDisabled = status === 'processing' || status === 'speaking' || !docLoaded;
  const isRecording = status === 'recording';

  return (
    <>
      {/* Status bar (moved here for grouping, though original had it separated) */}
      <div className="status-bar">
        <div className={`status-dot ${status}`}></div>
        <span className="status-text">{getStatusText()}</span>
      </div>

      <footer className="mic-footer">
        <div className={`waveform ${isRecording ? 'active' : ''}`} id="waveform">
          <span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        
        <button 
          className={`mic-btn ${status === 'ready' || status === 'idle' ? '' : status}`}
          onClick={onMicClick}
          disabled={isBtnDisabled}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          <span className="mic-ring"></span>
          <span className="mic-ring mic-ring-2"></span>
          <svg
            className="mic-icon"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <svg
            className="stop-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="4" y="4" width="16" height="16" rx="3" />
          </svg>
        </button>
        <p className="mic-hint">
          {docLoaded ? "Click to toggle recording" : "Upload a PDF or paste text first"}
        </p>
      </footer>
    </>
  );
};

export default MicFooter;
