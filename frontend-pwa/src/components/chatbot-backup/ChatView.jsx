import { useState, useRef, useEffect } from 'react';
import MessageBubble from './core/MessageBubble';

const ChatView = ({ 
  messages, 
  onSendMessage,
  onBack, 
  onClose,
  onClearAndBack,
  isLoading = false,
  elderlyMode = false 
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // 음성 인식 초기화
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onSendMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onSendMessage]);

  // 새 메시지가 추가되면 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('음성 인식을 지원하지 않는 브라우저입니다.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const renderMessage = (msg, index) => {
    if (msg.suggestions) {
      // 추천 질문 메시지
      return (
        <div key={msg.id} className="message bot">
          <div className="bot-avatar">🤖</div>
          <div className="message-content">
            <div className="message-bubble bot">
              {msg.text}
            </div>
            <div className="suggestion-buttons">
              {msg.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="suggestion-btn"
                  onClick={() => onSendMessage(suggestion.text || suggestion)}
                >
                  {suggestion.icon && <span className="btn-icon">{suggestion.icon}</span>}
                  <span className="btn-text">{suggestion.text || suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 일반 메시지
    return (
      <div key={msg.id} className={`message ${msg.sender}`}>
        {msg.sender === 'bot' && (
          <div className="bot-avatar">🤖</div>
        )}
        <div className="message-content">
          {msg.sender === 'user' ? (
            <div className={`message-bubble user ${msg.isError ? 'error' : ''}`}>
              {msg.text}
            </div>
          ) : (
            <MessageBubble message={msg} type="bot" />
          )}
          <div className="message-time">
            {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-view">
      {/* 상단 바 - 뒤로가기 명확하게 */}
      <header className="chat-header">
        <button className="back-btn" onClick={onBack}>
          <span className="icon">←</span>
          <span className="text">뒤로</span>
        </button>
        
        <h2 className="chat-title">AI 병원 도우미</h2>
        
        <div className="header-actions">
          {messages.length > 0 && (
            <button className="clear-btn" onClick={onClearAndBack} title="대화 지우고 처음으로">
              🗑️
            </button>
          )}
          <button className="close-btn" onClick={onClose}>
            <span className="icon">✕</span>
          </button>
        </div>
      </header>

      {/* 메시지 영역 - 넓고 깔끔하게 */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <div className="empty-text">대화를 시작해보세요</div>
          </div>
        ) : (
          messages.map((msg, index) => renderMessage(msg, index))
        )}
        
        {isLoading && (
          <div className="message bot">
            <div className="bot-avatar">🤖</div>
            <div className="message-content">
              <div className="message-bubble bot typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">답변을 준비하고 있어요...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 하단 입력 - 심플하게 */}
      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={elderlyMode ? "메시지를 입력하세요..." : "메시지 입력..."}
            className="chat-input"
            rows={1}
            disabled={isLoading}
          />
          
          <button 
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceInput}
            disabled={isLoading}
            title="음성 입력"
          >
            {isListening ? '🔴' : '🎤'}
          </button>
          
          <button 
            className="send-btn"
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            전송
          </button>
        </div>
        
        {isListening && (
          <div className="voice-status">
            <div className="voice-animation">
              <div className="voice-wave"></div>
              <div className="voice-wave"></div>
              <div className="voice-wave"></div>
            </div>
            <span className="voice-text">음성을 듣고 있어요...</span>
            <button 
              className="stop-voice-btn"
              onClick={() => recognitionRef.current?.stop()}
            >
              중지
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;