import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

const MessageList = ({ messages, isLoading, typingIndicator }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 새 메시지가 추가될 때마다 스크롤을 아래로
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [messages.length]);

  const renderTypingIndicator = () => {
    if (!typingIndicator) return null;

    return (
      <div className="message-bubble bot-bubble typing-bubble">
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="typing-text">AI 도우미가 답변을 준비하고 있습니다...</div>
      </div>
    );
  };

  const renderWelcomeMessage = () => {
    if (messages.length > 0) return null;

    return (
      <div className="welcome-section">
        <div className="welcome-avatar">
          <div className="avatar-icon">🤖</div>
        </div>
        <div className="welcome-content">
          <h3 className="welcome-title">안녕하세요!</h3>
          <p className="welcome-subtitle">
            AI 병원 도우미입니다. 검사 안내, 대기 현황, 위치 정보 등을 도와드릴게요.
          </p>
          <div className="welcome-suggestions">
            <div className="suggestion-title">이런 질문을 해보세요:</div>
            <div className="suggestion-list">
              <div className="suggestion-item">💬 "CT 검사 어디서 받나요?"</div>
              <div className="suggestion-item">💬 "지금 몇 번까지 호출됐나요?"</div>
              <div className="suggestion-item">💬 "검사 전 준비사항이 뭔가요?"</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="message-list-container"
      ref={messagesContainerRef}
    >
      <div className="message-list">
        {renderWelcomeMessage()}
        
        {messages.map((message, index) => (
          <div key={message.id || index} className="message-item">
            <MessageBubble 
              message={message} 
              type={message.sender === 'user' ? 'user' : 'bot'}
            />
          </div>
        ))}
        
        {isLoading && renderTypingIndicator()}
        
        {/* 스크롤 앵커 */}
        <div ref={messagesEndRef} className="messages-end" />
      </div>
      
      {/* 빠른 스크롤 버튼 */}
      {messages.length > 5 && (
        <button 
          className="scroll-to-bottom-btn"
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="최신 메시지로 이동"
        >
          <span className="scroll-icon">⬇️</span>
          <span className="scroll-text">최신</span>
        </button>
      )}
    </div>
  );
};

export default MessageList;