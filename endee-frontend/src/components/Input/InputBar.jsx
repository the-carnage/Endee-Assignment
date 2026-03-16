import { useState } from 'react';
import './InputBar.css';

const InputBar = ({ docLoaded, onSendMessage, isProcessing }) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && docLoaded && !isProcessing) {
      onSendMessage({
        role: 'user',
        text: inputText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setInputText('');
    }
  };

  const handleVoiceClick = () => {
    if (!docLoaded || isProcessing) return;
    setIsRecording(!isRecording);
  };

  return (
    <div className="input-bar">
      <div className="input-container">
        <button 
          className={`voice-btn ${isRecording ? 'recording' : ''} ${!docLoaded ? 'disabled' : ''}`}
          onClick={handleVoiceClick}
          disabled={!docLoaded || isProcessing}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          
          {isRecording && (
            <>
              <span className="pulse-ring"></span>
              <span className="pulse-ring pulse-ring-2"></span>
            </>
          )}
        </button>

        <form className="text-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="text-input"
            placeholder={docLoaded ? "Ask a question..." : "Upload a document first"}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!docLoaded || isProcessing}
          />
          
          <button 
            type="submit" 
            className="send-btn"
            disabled={!inputText.trim() || !docLoaded || isProcessing}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M18 2L9 11M18 2l-6 16-3-7-7-3 16-6z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
      
      <div className="input-status">
        <div className={`status-indicator ${docLoaded ? 'ready' : 'idle'}`}></div>
        <span className="status-text">
          {isProcessing ? 'Processing...' : isRecording ? 'Recording...' : docLoaded ? 'Ready' : 'Upload document to start'}
        </span>
      </div>
    </div>
  );
};

export default InputBar;