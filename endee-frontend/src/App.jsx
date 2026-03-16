import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';

function App() {
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(() => {
    const saved = localStorage.getItem('endee_subtitles');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [docLoaded, setDocLoaded] = useState(() => {
    return localStorage.getItem('endee_docLoaded') === 'true';
  });
  
  const [appStatus, setAppStatus] = useState(() => {
    const saved = localStorage.getItem('endee_appStatus');
    return saved || 'idle';
  });
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('endee_messages');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [docSummary, setDocSummary] = useState(() => {
    return localStorage.getItem('endee_docSummary') || '';
  });

  const [uploadState, setUploadState] = useState('idle');
  const [docInfo, setDocInfo] = useState({ name: '', meta: '' });
  const [activeTab, setActiveTab] = useState('pdf');
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef(null);
  const appStatusRef = useRef(appStatus);
  const subtitlesRef = useRef(subtitlesEnabled);
  const messagesRef = useRef(messages);
  const conversationEndRef = useRef(null);

  useEffect(() => { appStatusRef.current = appStatus; }, [appStatus]);
  useEffect(() => { subtitlesRef.current = subtitlesEnabled; }, [subtitlesEnabled]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const { isRecording, audioUrl, startRecording, stopRecording } = useVoiceRecorder();

  const addMessage = useCallback((role, text) => {
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setMessages((prev) => [...prev, { role, text, time }]);
  }, []);

  const processAudioRecording = useCallback(
    async (url) => {
      setAppStatus('processing');

      try {
        const response = await fetch(url);
        const audioBlob = await response.blob();

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const recentHistory = messagesRef.current
          .slice(-6)
          .map((m) => ({ role: m.role, text: m.text }));
        formData.append('history', JSON.stringify(recentHistory));

        const apiRes = await fetch('http://localhost:8000/query/voice', {
          method: 'POST',
          body: formData,
        });

        if (!apiRes.ok) {
          throw new Error(`Server returned ${apiRes.status}`);
        }

        const data = await apiRes.json();

        if (subtitlesRef.current && data.transcript) {
          addMessage('user', data.transcript);
        }

        if (subtitlesRef.current && data.response) {
          addMessage('ai', data.response);
        }

        setAppStatus('ready');
      } catch (error) {
        console.error('Speech processing error:', error);
        if (subtitlesRef.current) {
          addMessage(
            'ai',
            'Sorry, I had trouble connecting to the backend server to process your voice.',
          );
        }
        setAppStatus('ready');
      }
    },
    [addMessage],
  );

  useEffect(() => {
    localStorage.setItem('endee_subtitles', JSON.stringify(subtitlesEnabled));
  }, [subtitlesEnabled]);

  useEffect(() => {
    localStorage.setItem('endee_docLoaded', docLoaded);
  }, [docLoaded]);

  useEffect(() => {
    if (appStatus === 'idle' || appStatus === 'ready') {
      localStorage.setItem('endee_appStatus', appStatus);
    }
  }, [appStatus]);

  useEffect(() => {
    localStorage.setItem('endee_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('endee_docSummary', docSummary);
  }, [docSummary]);

  useEffect(() => {
    if (isRecording) {
      setAppStatus('recording');
    }
  }, [isRecording]);

  useEffect(() => {
    if (audioUrl && !isRecording && appStatusRef.current === 'recording') {
      processAudioRecording(audioUrl);
    }
  }, [audioUrl, isRecording, processAudioRecording]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    if (activeTab === 'pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please choose a PDF file.');
      return;
    }
    
    if (activeTab === 'image' && !file.type.startsWith('image/')) {
      alert('Please choose an Image file.');
      return;
    }

    setUploadState('progress');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/ingest/file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      const chunks = data.chunks_indexed || 0;

      setDocInfo({
        name: file.name,
        meta: `${chunks} chunks indexed`,
      });
      setUploadState('loaded');
      setDocLoaded(true);
      setDocSummary(data.summary || '');
      
      if (subtitlesEnabled && data.summary) {
        addMessage('ai', `Document loaded successfully! Here is a quick summary:\n\n${data.summary}`);
      }
      
      if (appStatus === 'idle') setAppStatus('ready');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Backend connection failed! Is the FastAPI server running on port 8000?');
      setUploadState('idle');
    }
  };

  const handleTextIngest = async () => {
    const content = textContent.trim();
    const title = textTitle.trim() || 'Pasted Text';

    if (!content) {
      alert('Please paste some text first.');
      return;
    }
    if (content.length < 50) {
      alert('Text is too short (minimum 50 characters).');
      return;
    }

    setUploadState('progress');

    try {
      const response = await fetch('http://localhost:8000/ingest/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      const chunks = data.chunks_indexed || 0;

      setDocInfo({
        name: title,
        meta: `${content.length.toLocaleString()} chars · ${chunks} chunks indexed`,
      });
      setUploadState('loaded');
      setDocLoaded(true);
      setDocSummary(data.summary || '');
      
      if (subtitlesEnabled && data.summary) {
        addMessage('ai', `Document loaded successfully! Here is a quick summary:\n\n${data.summary}`);
      }
      
      if (appStatus === 'idle') setAppStatus('ready');
    } catch (error) {
      console.error('Text ingest failed:', error);
      alert('Backend connection failed! Is the FastAPI server running on port 8000?');
      setUploadState('idle');
    }
  };

  const handleMicClick = () => {
    if (!docLoaded) return;

    if (appStatus === 'ready' || appStatus === 'idle') {
      startRecording();
    } else if (appStatus === 'recording') {
      stopRecording();
    }
  };

  const handleClearData = async () => {
    try {
      await fetch('http://localhost:8000/clear', { method: 'POST' });
    } catch (e) {
      console.error('Failed to clear backend DB', e);
    }

    localStorage.clear();
    window.location.replace(window.location.pathname);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setActiveTab('image');
        handleFileUpload(file);
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        setActiveTab('pdf');
        handleFileUpload(file);
      } else {
        alert('Please drop a PDF or Image file.');
      }
    }
  };

  return (
    <div className="app-root">
      <div className="gradient-orb orb-1"></div>
      <div className="gradient-orb orb-2"></div>
      
      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-brand">
            <div className="brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" 
                      fill="currentColor"/>
              </svg>
            </div>
            <div className="brand-text">
              <h1>Endee</h1>
              <p>Voice RAG Assistant</p>
            </div>
          </div>
          
          <div className="header-controls">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={subtitlesEnabled}
                onChange={(e) => setSubtitlesEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Subtitles</span>
            </label>
            
            <button className="header-btn" onClick={handleClearData}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6v14H5V6"/>
              </svg>
              Clear
            </button>
          </div>
        </header>

        {/* Upload Zone */}
        <section 
          className={`upload-section ${uploadState === 'loaded' ? 'loaded' : ''} ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept={activeTab === 'image' ? 'image/*' : '.pdf'}
            hidden
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />

          {uploadState !== 'loaded' && (
            <div className="source-tabs">
              <button
                className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
                onClick={() => setActiveTab('pdf')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                PDF
              </button>
              <button
                className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="17" y1="10" x2="3" y2="10"/>
                  <line x1="21" y1="6" x2="3" y2="6"/>
                  <line x1="21" y1="14" x2="3" y2="14"/>
                  <line x1="13" y1="18" x2="3" y2="18"/>
                </svg>
                Text
              </button>
              <button
                className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
                onClick={() => setActiveTab('image')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Image
              </button>
            </div>
          )}

          {uploadState === 'idle' && activeTab !== 'text' && (
            <div className="upload-idle">
              <div className="upload-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </div>
              <h3>Drop {activeTab === 'pdf' ? 'PDF' : 'Image'} or click to upload</h3>
              <p>Your document will be indexed for voice queries</p>
              <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                Choose {activeTab === 'pdf' ? 'PDF' : 'Image'}
              </button>
            </div>
          )}

          {uploadState === 'idle' && activeTab === 'text' && (
            <div className="upload-text">
              <input
                type="text"
                className="text-title"
                placeholder="Title (optional)"
                maxLength="80"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
              />
              <textarea
                className="text-area"
                placeholder="Paste your text here — notes, articles, transcripts, anything you want to ask questions about…"
                rows="6"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
              <div className="text-footer">
                <span className="char-count">
                  {textContent.length.toLocaleString()} character{textContent.length !== 1 ? 's' : ''}
                </span>
                <button className="upload-btn" onClick={handleTextIngest}>
                  Index Text
                </button>
              </div>
            </div>
          )}

          {uploadState === 'progress' && (
            <div className="upload-progress">
              <div className="spinner"></div>
              <span>Processing on Backend...</span>
            </div>
          )}

          {uploadState === 'loaded' && (
            <div className="upload-loaded">
              <div className="doc-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="doc-info">
                <span className="doc-name">{docInfo.name}</span>
                <span className="doc-meta">{docInfo.meta}</span>
              </div>
              <button className="replace-btn" onClick={() => {
                setUploadState('idle');
                setDocLoaded(false);
                if (activeTab !== 'text') fileInputRef.current?.click();
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Replace
              </button>
            </div>
          )}
        </section>

        {/* Conversation Area */}
        <main className="conversation-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                </svg>
              </div>
              <p>Ready to listen</p>
              <span>Upload a document and start asking questions</span>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.role}`}>
                  <div className="bubble-avatar">
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className="bubble-body">
                    <div className="bubble-text">{msg.text}</div>
                    <div className="bubble-time">{msg.time}</div>
                  </div>
                </div>
              ))}
              
              {appStatus === 'processing' && (
                <div className="chat-bubble ai thinking">
                  <div className="bubble-avatar">AI</div>
                  <div className="bubble-body">
                    <div className="bubble-text">
                      <div className="dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={conversationEndRef} />
            </>
          )}
        </main>

        {/* Footer with Mic */}
        <footer className="app-footer">
          <div className="status-bar">
            <div className={`status-dot ${appStatus}`}></div>
            <span className="status-text">
              {appStatus === 'idle' && 'Upload document to start'}
              {appStatus === 'ready' && 'Ready'}
              {appStatus === 'recording' && 'Recording...'}
              {appStatus === 'processing' && 'Processing...'}
            </span>
          </div>
          
          <div className="mic-container">
            <div className={`waveform ${isRecording ? 'active' : ''}`}>
              {[...Array(10)].map((_, i) => <span key={i}></span>)}
            </div>
            
            <button 
              className={`mic-btn ${appStatus}`}
              onClick={handleMicClick}
              disabled={!docLoaded || appStatus === 'processing'}
            >
              <div className="mic-ring"></div>
              <div className="mic-ring mic-ring-2"></div>
              
              {appStatus === 'recording' ? (
                <svg className="stop-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg className="mic-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>
                </svg>
              )}
            </button>
          </div>
          
          <p className="mic-hint">
            {docLoaded ? 'Click to ask a question' : 'Upload a document first'}
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
