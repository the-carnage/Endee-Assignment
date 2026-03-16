import { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ isOpen, docLoaded, onDocumentLoad }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          onDocumentLoad(true);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        <div className="sidebar-section">
          <h3 className="section-title">Document Upload</h3>
          
          <div 
            className={`upload-zone ${isDragging ? 'dragging' : ''} ${docLoaded ? 'loaded' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!docLoaded && !isUploading && (
              <div className="upload-content">
                <div className="upload-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 8v24M16 20l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M40 32v8H8v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h4>Drop your file here</h4>
                <p>or click to browse</p>
                <button className="upload-btn">Choose File</button>
              </div>
            )}
            
            {isUploading && (
              <div className="upload-progress">
                <div className="progress-circle">
                  <svg width="60" height="60" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="25" fill="none" stroke="var(--border-primary)" strokeWidth="4"/>
                    <circle 
                      cx="30" cy="30" r="25" 
                      fill="none" 
                      stroke="var(--brand-purple)" 
                      strokeWidth="4"
                      strokeDasharray={`${uploadProgress * 1.57} 157`}
                      strokeLinecap="round"
                      transform="rotate(-90 30 30)"
                    />
                  </svg>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>
                <p>Uploading document...</p>
              </div>
            )}
            
            {docLoaded && !isUploading && (
              <div className="upload-success">
                <div className="success-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" fill="var(--success)" opacity="0.2"/>
                    <path d="M10 16l4 4 8-8" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h4>Document Loaded</h4>
                <p>Ready for questions</p>
                <button className="replace-btn">Replace Document</button>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="section-title">Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{docLoaded ? '1' : '0'}</span>
                <span className="stat-label">Documents</span>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2v16M2 10h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <span className="stat-value">{docLoaded ? '12' : '0'}</span>
                <span className="stat-label">Chunks</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;