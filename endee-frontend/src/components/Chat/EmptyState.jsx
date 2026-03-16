import './EmptyState.css';

const EmptyState = () => {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="35" stroke="url(#gradient)" strokeWidth="2" strokeDasharray="4 4"/>
          <path d="M40 20v40M20 40h40" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round"/>
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--brand-purple)"/>
              <stop offset="100%" stopColor="var(--brand-pink)"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <div className="empty-content">
        <h2>Welcome to Endee Intelligence</h2>
        <p>Your AI-powered document assistant</p>
      </div>
      
      <div className="empty-steps">
        <div className="step-card">
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Upload Document</h4>
            <p>Drop a PDF or paste text in the sidebar</p>
          </div>
        </div>
        
        <div className="step-card">
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Ask Questions</h4>
            <p>Use voice or text to query your document</p>
          </div>
        </div>
        
        <div className="step-card">
          <div className="step-number">3</div>
          <div className="step-content">
            <h4>Get Answers</h4>
            <p>Receive AI-powered insights instantly</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;