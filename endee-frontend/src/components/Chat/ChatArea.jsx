import { useEffect, useRef } from 'react';
import './ChatArea.css';
import Message from './Message';
import EmptyState from './EmptyState';

const ChatArea = ({ messages, isProcessing }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-area">
      <div className="chat-container">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="messages-list">
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
            {isProcessing && (
              <div className="thinking-indicator">
                <div className="thinking-avatar">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="thinking-content">
                  <div className="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="thinking-text">AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;