import React, { useRef, useState, useEffect } from 'react';

const UploadZone = ({ onUploadComplete }) => {
  const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' | 'text'
  const [uploadState, setUploadState] = useState('idle'); // 'idle' | 'progress' | 'loaded'
  const [uploadProgressText, setUploadProgressText] = useState('Processing...');
  const [chunkBadge, setChunkBadge] = useState('');
  const [docInfo, setDocInfo] = useState({ name: '', meta: '' });
  const [isDragOver, setIsDragOver] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  
  const fileInputRef = useRef(null);
  const sourceKnobRef = useRef(null);
  const togglePdfRef = useRef(null);
  const toggleTextRef = useRef(null);

  // Position the knob background
  useEffect(() => {
    const activeBtn = activeTab === 'pdf' ? togglePdfRef.current : toggleTextRef.current;
    if (activeBtn && sourceKnobRef.current) {
      sourceKnobRef.current.style.width = `${activeBtn.offsetWidth}px`;
      sourceKnobRef.current.style.transform = `translateX(${activeBtn.offsetLeft - 3}px)`;
    }
  }, [activeTab]);

  const simulateProcessing = (chunks, name, metaBuilder) => {
    setUploadState('progress');
    setChunkBadge(`~${chunks} chunks`);
    if (chunks < 30) setUploadProgressText('Processing... (~30s)');
    else if (chunks < 50) setUploadProgressText('Processing... (~60s)');
    else setUploadProgressText('Processing... (~90s)');

    // Simulate backend processing delay
    setTimeout(() => {
      setChunkBadge(`${chunks} chunks`);
      setDocInfo({
        name: name,
        meta: metaBuilder(chunks)
      });
      setUploadState('loaded');
      if (onUploadComplete) onUploadComplete(true);
    }, 1500); // Mock 1.5s delay
  };

  const handleFileUpload = (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please choose a PDF file.');
      return;
    }
    const estimatedChunks = Math.max(1, Math.ceil(file.size / 15000));
    simulateProcessing(
      estimatedChunks, 
      file.name, 
      (chunks) => `12 pages · ${chunks} chunks indexed` // Mocked page count
    );
  };

  const handleTextIngest = () => {
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

    const estimatedChunks = Math.max(1, Math.ceil(content.length / 350));
    simulateProcessing(
      estimatedChunks, 
      title, 
      (chunks) => `${content.length.toLocaleString()} chars · ${chunks} chunks indexed`
    );
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
    if (file) handleFileUpload(file);
  };

  return (
    <section 
      className={`upload-zone ${uploadState === 'loaded' ? 'loaded' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".pdf" 
        hidden 
        onChange={(e) => {
          if (e.target.files[0]) handleFileUpload(e.target.files[0]);
          e.target.value = ''; // reset
        }}
      />

      {/* Pill Toggle */}
      {uploadState !== 'loaded' && (
        <div className="source-toggle">
          <button 
            ref={togglePdfRef}
            className={`source-opt ${activeTab === 'pdf' ? 'active' : ''}`} 
            onClick={() => setActiveTab('pdf')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            PDF
          </button>
          <button 
            ref={toggleTextRef}
            className={`source-opt ${activeTab === 'text' ? 'active' : ''}`} 
            onClick={() => setActiveTab('text')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="17" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="13" y1="18" x2="3" y2="18" />
            </svg>
            Text
          </button>
          <span className="source-knob" ref={sourceKnobRef}></span>
        </div>
      )}

      {/* Idle PDF */}
      {uploadState === 'idle' && activeTab === 'pdf' && (
        <div className="upload-idle">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <div className="upload-idle-text">
            <span className="upload-title">Drop a PDF or click to upload</span>
            <span className="upload-sub">Your document will be indexed for voice queries</span>
          </div>
          <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>Choose PDF</button>
        </div>
      )}

      {/* Idle Text */}
      {uploadState === 'idle' && activeTab === 'text' && (
        <div className="upload-text-idle">
          <input
            type="text"
            className="text-title-input"
            placeholder="Title (optional)"
            maxLength="80"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
          />
          <textarea
            className="text-content-area"
            placeholder="Paste your text here — notes, articles, transcripts, anything you want to ask questions about…"
            rows="6"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
          ></textarea>
          <div className="text-char-row">
            <span className="text-char-count">
              {textContent.length.toLocaleString()} character{textContent.length !== 1 ? 's' : ''}
            </span>
            <button className="upload-btn" onClick={handleTextIngest}>Index Text</button>
          </div>
        </div>
      )}

      {/* Uploading Progress */}
      {uploadState === 'progress' && (
        <div className="upload-progress">
          <div className="spinner"></div>
          <div className="progress-info">
            <span>{uploadProgressText}</span>
            <span className="chunk-badge">{chunkBadge}</span>
          </div>
        </div>
      )}

      {/* Loaded State */}
      {uploadState === 'loaded' && (
        <div className="upload-loaded">
          <div className="doc-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="doc-info">
            <span className="doc-name">{docInfo.name}</span>
            <span className="doc-meta">{docInfo.meta}</span>
          </div>
          <button 
            className="doc-replace-btn" 
            title="Upload different source"
            onClick={() => {
              setUploadState('idle');
              if (onUploadComplete) onUploadComplete(false);
              if (activeTab === 'pdf') fileInputRef.current?.click();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Replace
          </button>
        </div>
      )}
    </section>
  );
};

export default UploadZone;
