import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import './styles/stage3.css';

const Stage3_FullChat = ({ 
  elderlyMode, 
  messages, 
  isTyping,
  onBack, 
  onClose, 
  onSendMessage 
}) => {
  const messagesEndRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleMinimize = () => {
    setIsMinimized(true);
    setTimeout(() => {
      onBack();
    }, 300);
  };

  return (
    <div className={`
      full-chat-stage3
      ${elderlyMode ? 'elderly-mode' : ''}
      ${isMinimized ? 'minimizing' : ''}
    `}>
      <header className="chat-header">
        <button className="nav-btn back-btn" onClick={handleMinimize}>
          <span className="icon">←</span>
          <span className="text">뒤로</span>
        </button>
        
        <div className="header-title">
          <h1>AI 병원 도우미</h1>
          <span className="status">
            <span className="status-dot"></span>
            온라인
          </span>
        </div>
        
        <button className="nav-btn close-btn" onClick={onClose}>
          <span className="icon">✕</span>
        </button>
      </header>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>AI 병원 도우미입니다</h3>
            <p>병원 내 안내가 필요하시면 언제든 말씀해 주세요!</p>
            <div className="suggestions">
              <span className="suggestion-tag">검사실 위치</span>
              <span className="suggestion-tag">대기 시간</span>
              <span className="suggestion-tag">주차 안내</span>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg}
                elderlyMode={elderlyMode}
              />
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-bubble">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput 
        onSendMessage={onSendMessage}
        elderlyMode={elderlyMode}
        disabled={isTyping}
      />
    </div>
  );
};

export default Stage3_FullChat;