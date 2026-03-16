import { useState } from 'react';
import './Header.css';

const Header = ({ onToggleSidebar, onClearData }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" 
                    fill="url(#gradient)" stroke="currentColor" strokeWidth="1.5"/>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed"/>
                  <stop offset="100%" stopColor="#ec4899"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <h1>Endee Intelligence</h1>
            <p>Voice RAG Assistant</p>
          </div>
        </div>
      </div>

      <div className="header-right">
        <button className="header-btn" onClick={onClearData} title="Clear all data">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 5h12M7 5V3h4v2M8 8v5M10 8v5M5 5l1 10h6l1-10" 
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Clear</span>
        </button>

        <div className="header-menu">
          <button 
            className="header-btn icon-only" 
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="3" r="1.5" fill="currentColor"/>
              <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
              <circle cx="9" cy="15" r="1.5" fill="currentColor"/>
            </svg>
          </button>
          
          {showMenu && (
            <div className="dropdown-menu">
              <button className="menu-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Settings
              </button>
              <button className="menu-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                About
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;