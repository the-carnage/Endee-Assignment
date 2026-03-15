import { useEffect, useRef } from "react";

const ConversationArea = ({ messages, isThinking }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  return (
    <main className="conversation-area" ref={scrollRef}>
      {messages.length === 0 && !isThinking ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p>Press the mic to start talking</p>
          <span>Your conversation will appear here</span>
        </div>
      ) : (
        <>
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble ${msg.role}`}>
              <div className="bubble-avatar">
                {msg.role === "user" ? "You" : "AI"}
              </div>
              <div className="bubble-body">
                <div className="bubble-text">{msg.text}</div>
                <div className="bubble-time">{msg.time}</div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="chat-bubble ai thinking-bubble">
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
        </>
      )}
    </main>
  );
};

export default ConversationArea;
