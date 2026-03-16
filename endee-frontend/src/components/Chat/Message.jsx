import './Message.css';

const Message = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user' : 'ai'}`}>
      <div className="message-avatar">
        {isUser ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 18c0-3.5 2.5-6 6-6s6 2.5 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L2 7v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V7l-8-5z" 
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      
      <div className="message-content">
        <div className="message-bubble">
          <p>{message.text}</p>
        </div>
        {message.time && (
          <span className="message-time">{message.time}</span>
        )}
      </div>
    </div>
  );
};

export default Message;