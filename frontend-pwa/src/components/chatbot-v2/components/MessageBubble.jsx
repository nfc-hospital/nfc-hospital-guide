import React from 'react';

const MessageBubble = ({ message, elderlyMode }) => {
  const { type, text, timestamp } = message;
  const isUser = type === 'user';
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className={`message-wrapper ${isUser ? 'user-message' : 'bot-message'} ${elderlyMode ? 'elderly-mode' : ''}`}>
      <div className="message-bubble">
        {!isUser && (
          <div className="bot-avatar">
            🏥
          </div>
        )}
        <div className="message-content">
          <div className="message-text">
            {text}
          </div>
          <div className="message-time">
            {formatTime(timestamp)}
          </div>
        </div>
        {isUser && (
          <div className="user-avatar">
            👤
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;