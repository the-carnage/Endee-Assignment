import React from 'react';

const AppHeader = ({ subtitlesEnabled, setSubtitlesEnabled }) => {
  return (
    <header className="app-header">
      <div className="header-icon">
        <svg
          width="22"
          height="22"
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
      </div>
      <div className="header-text">
        <h1>Note Retriever</h1>
        <p>Powered by Gemini &amp; Whisper</p>
      </div>
      <div className="header-controls">
        <label className="toggle-label" title="Toggle subtitles">
          <input
            type="checkbox"
            checked={subtitlesEnabled}
            onChange={(e) => setSubtitlesEnabled(e.target.checked)}
          />
          <span className="toggle-track"><span className="toggle-thumb"></span></span>
          <span className="toggle-text">Subtitles</span>
        </label>
      </div>
    </header>
  );
};

export default AppHeader;
