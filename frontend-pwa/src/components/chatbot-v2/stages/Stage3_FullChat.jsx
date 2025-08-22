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
  const [isSpeaking, setIsSpeaking] = useState(false);
  
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

  // 음성 읽기 기능
  const handleVoiceRead = () => {
    if ('speechSynthesis' in window) {
      // 현재 음성 중지
      window.speechSynthesis.cancel();
      
      if (isSpeaking) {
        setIsSpeaking(false);
        return;
      }

      // 마지막 봇 메시지 찾기
      const lastBotMessage = messages.filter(msg => msg.type === 'bot').pop();
      
      if (lastBotMessage) {
        const utterance = new SpeechSynthesisUtterance(lastBotMessage.text);
        utterance.lang = 'ko-KR';
        utterance.rate = elderlyMode ? 0.9 : 1.0; // 고령자 모드에서는 천천히
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
      }
    } else {
      alert('이 브라우저에서는 음성 읽기를 지원하지 않습니다.');
    }
  };

  // 컴포넌트 언마운트 시 음성 중지
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className={`
      full-chat-stage3
      ${elderlyMode ? 'elderly-mode' : ''}
      ${isMinimized ? 'minimizing' : ''}
    `}>
      <header className="chat-header">
        <button className="nav-btn back-btn" onClick={handleMinimize}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="38" fill="url(#chatGradient)" fillOpacity="0.1"/>
                <path d="M40 20C26.745 20 16 28.954 16 40C16 44.843 18.262 49.215 21.913 52.427L20 60L28.109 56.409C31.303 57.595 34.945 58.287 39 58.287C52.255 58.287 64 50.046 64 40C64 29.954 52.255 20 40 20Z" fill="url(#chatGradient)"/>
                <circle cx="28" cy="40" r="3" fill="white"/>
                <circle cx="40" cy="40" r="3" fill="white"/>
                <circle cx="52" cy="40" r="3" fill="white"/>
                <defs>
                  <linearGradient id="chatGradient" x1="16" y1="20" x2="64" y2="60" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#60A5FA"/>
                    <stop offset="0.5" stopColor="#3B82F6"/>
                    <stop offset="1" stopColor="#2563EB"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
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

      {/* 음성 읽기 버튼 영역 */}
      {messages.length > 0 && messages.some(msg => msg.type === 'bot') && (
        <div className="voice-control-area">
          <button 
            className={`voice-read-btn ${isSpeaking ? 'speaking' : ''}`}
            onClick={handleVoiceRead}
            aria-label={isSpeaking ? "음성 중지" : "답변 듣기"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {isSpeaking ? (
                // 정지 아이콘
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
              ) : (
                // 스피커 아이콘
                <>
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" fill="currentColor"/>
                  <path d="M15 9C15 9 17 10 17 12C17 14 15 15 15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M18 6C18 6 21 8 21 12C21 16 18 18 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </>
              )}
            </svg>
            <span>{isSpeaking ? '음성 중지' : '답변 듣기'}</span>
          </button>
        </div>
      )}

      <ChatInput 
        onSendMessage={onSendMessage}
        elderlyMode={elderlyMode}
        disabled={isTyping}
      />
    </div>
  );
};

export default Stage3_FullChat;