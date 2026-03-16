import { useState } from "react";

const AppHeader = ({ subtitlesEnabled, setSubtitlesEnabled, onClearData }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
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
          {onClearData && (
            <button
              type="button"
              className="clear-data-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClearData();
              }}
              title="Clear all documents and chat history"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Reset
            </button>
          )}
          <label className="toggle-label" title="Toggle subtitles">
            <input
              type="checkbox"
              checked={subtitlesEnabled}
              onChange={(e) => setSubtitlesEnabled(e.target.checked)}
            />
            <span className="toggle-track">
              <span className="toggle-thumb"></span>
            </span>
            <span className="toggle-text">Subtitles</span>
          </label>
          <button
            type="button"
            className="info-btn"
            onClick={() => setShowInfo(true)}
            aria-label="App information"
            title="How to use"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="8.5" strokeWidth="2.5" />
              <line x1="12" y1="12" x2="12" y2="16" />
            </svg>
          </button>
        </div>
      </header>

      {showInfo && (
        <div className="info-overlay" onClick={() => setShowInfo(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="info-modal-header">
              <h2>About Note Retriever</h2>
              <button
                className="info-close-btn"
                onClick={() => setShowInfo(false)}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="info-modal-body">
              <p className="info-desc">
                Note Retriever is a Retrieval-Augmented Generation (RAG) app.
                Upload any document and ask questions about it — by voice or by
                typing.
              </p>

              <div className="info-steps">
                <div className="info-step">
                  <span className="info-step-num">1</span>
                  <div>
                    <strong>Upload a source</strong>
                    <p>
                      Drop a PDF, image, or paste text using the panel at the
                      top. The document is chunked and indexed into a vector
                      database.
                    </p>
                  </div>
                </div>
                <div className="info-step">
                  <span className="info-step-num">2</span>
                  <div>
                    <strong>Ask a question</strong>
                    <p>
                      Type your question in the input box and press{" "}
                      <kbd>Enter</kbd>, or click the mic button to record your
                      voice.
                    </p>
                  </div>
                </div>
                <div className="info-step">
                  <span className="info-step-num">3</span>
                  <div>
                    <strong>Get an answer</strong>
                    <p>
                      The app retrieves the most relevant passages and generates
                      a precise answer using an LLM.
                    </p>
                  </div>
                </div>
                <div className="info-step">
                  <span className="info-step-num">4</span>
                  <div>
                    <strong>Reset anytime</strong>
                    <p>
                      Click <strong>Reset</strong> in the header to clear the
                      document and start fresh with a new source.
                    </p>
                  </div>
                </div>
              </div>

              <div className="info-tech">
                <span>Embeddings: Gemini</span>
                <span>Speech: Whisper</span>
                <span>LLM: Groq</span>
                <span>Vector DB: Endee</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppHeader;
