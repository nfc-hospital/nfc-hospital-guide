import { useState, useEffect, useRef } from 'react';

const ElderlyMode = ({ 
  messages = [], 
  onSendMessage, 
  isLoading = false,
  onClose 
}) => {
  const [fontSize, setFontSize] = useState('xl'); // xl, 2xl, 3xl
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(messages.length - 1);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

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

    // 음성 합성 초기화
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, [onSendMessage]);

  // 새 메시지가 올 때마다 인덱스 업데이트 및 음성 읽기
  useEffect(() => {
    if (messages.length > 0) {
      const newIndex = messages.length - 1;
      setCurrentMessageIndex(newIndex);
      
      if (voiceEnabled && messages[newIndex] && messages[newIndex].sender !== 'user') {
        speakMessage(messages[newIndex]);
      }
    }
  }, [messages, voiceEnabled]);

  const speakMessage = (message) => {
    if (!synthRef.current || !voiceEnabled) return;
    
    // 기존 음성 중지
    synthRef.current.cancel();
    
    let textToSpeak = '';
    if (message.text) {
      textToSpeak = message.text;
    } else if (message.cardData) {
      textToSpeak = message.cardData.title || '카드 메시지';
    } else if (message.queueData) {
      textToSpeak = `현재 대기번호 ${message.queueData.queueNumber}번, 예상 대기시간은 약 ${message.queueData.estimatedWaitTime}분입니다.`;
    } else if (message.locationData) {
      textToSpeak = `${message.locationData.name} 위치 안내입니다.`;
    }
    
    if (textToSpeak) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.8; // 천천히 읽기
      utterance.volume = 0.8;
      synthRef.current.speak(utterance);
    }
  };

  const increaseFontSize = () => {
    const sizes = ['xl', '2xl', '3xl'];
    const currentIndex = sizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setFontSize(sizes[nextIndex]);
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled && synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('음성 인식을 지원하지 않는 브라우저입니다.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleQuickQuestion = (question) => {
    onSendMessage(question);
  };

  const handleEmergencyHelp = () => {
    // 응급 도움 요청
    window.dispatchEvent(new CustomEvent('emergency-help-requested'));
    onSendMessage('응급상황입니다. 도움이 필요합니다.');
  };

  const navigateMessage = (direction) => {
    if (messages.length === 0) return;
    
    let newIndex = currentMessageIndex;
    if (direction === 'prev' && currentMessageIndex > 0) {
      newIndex = currentMessageIndex - 1;
    } else if (direction === 'next' && currentMessageIndex < messages.length - 1) {
      newIndex = currentMessageIndex + 1;
    }
    
    setCurrentMessageIndex(newIndex);
    
    if (voiceEnabled) {
      speakMessage(messages[newIndex]);
    }
  };

  const getCurrentMessage = () => {
    return messages[currentMessageIndex] || null;
  };

  const renderCurrentMessage = () => {
    const message = getCurrentMessage();
    if (!message) {
      return (
        <div className="no-message">
          <div className="no-message-icon">💬</div>
          <div className="no-message-text">아직 대화가 없습니다</div>
          <div className="no-message-subtitle">아래 버튼을 눌러 질문해보세요</div>
        </div>
      );
    }

    const isFromBot = message.sender !== 'user';

    return (
      <div className={`elderly-message ${isFromBot ? 'from-bot' : 'from-user'}`}>
        <div className="message-sender">
          {isFromBot ? (
            <div className="bot-avatar">
              <span className="avatar-icon">🤖</span>
              <span className="avatar-name">AI 도우미</span>
            </div>
          ) : (
            <div className="user-avatar">
              <span className="avatar-icon">👤</span>
              <span className="avatar-name">나</span>
            </div>
          )}
        </div>
        
        <div className="message-content-large">
          {message.text && (
            <div className="message-text-large">
              {message.text}
            </div>
          )}
          
          {message.queueData && (
            <div className="queue-info-large">
              <div className="queue-number">
                대기번호: <span className="number-highlight">{message.queueData.queueNumber}번</span>
              </div>
              <div className="queue-wait">
                예상 대기시간: <span className="time-highlight">{message.queueData.estimatedWaitTime}분</span>
              </div>
            </div>
          )}
          
          {message.locationData && (
            <div className="location-info-large">
              <div className="location-name">
                📍 {message.locationData.name}
              </div>
              <div className="location-details">
                {message.locationData.building} {message.locationData.floor}층 {message.locationData.room}
              </div>
            </div>
          )}
        </div>
        
        {isFromBot && (
          <div className="message-actions-large">
            <button 
              className="action-btn-large replay"
              onClick={() => speakMessage(message)}
              disabled={!voiceEnabled}
            >
              <span className="btn-icon">🔊</span>
              <span className="btn-text">다시 듣기</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const themeClass = highContrast ? 'high-contrast' : 'default';

  return (
    <div className={`elderly-mode-container font-${fontSize} theme-${themeClass}`}>
      {/* 상단 접근성 도구 모음 */}
      <div className="accessibility-toolbar">
        <div className="toolbar-left">
          <button className="btn-large secondary" onClick={onClose}>
            <span className="icon">←</span>
            <span>뒤로</span>
          </button>
        </div>
        
        <div className="toolbar-center">
          <h1 className="app-title">병원 도우미</h1>
        </div>
        
        <div className="toolbar-right">
          <button className="btn-large" onClick={increaseFontSize}>
            <span className="icon">🔍+</span>
            <span>글자 크게</span>
          </button>
          <button className="btn-large" onClick={toggleHighContrast}>
            <span className="icon">🌓</span>
            <span>고대비</span>
          </button>
          <button className="btn-large" onClick={toggleVoice}>
            <span className="icon">🔊</span>
            <span>음성 {voiceEnabled ? '켜짐' : '꺼짐'}</span>
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="message-display-area">
        {renderCurrentMessage()}
        
        {/* 메시지 네비게이션 */}
        {messages.length > 1 && (
          <div className="message-navigation">
            <button 
              className="nav-btn prev"
              onClick={() => navigateMessage('prev')}
              disabled={currentMessageIndex === 0}
            >
              <span className="nav-icon">⬅️</span>
              <span className="nav-text">이전</span>
            </button>
            
            <div className="message-counter">
              {currentMessageIndex + 1} / {messages.length}
            </div>
            
            <button 
              className="nav-btn next"
              onClick={() => navigateMessage('next')}
              disabled={currentMessageIndex === messages.length - 1}
            >
              <span className="nav-text">다음</span>
              <span className="nav-icon">➡️</span>
            </button>
          </div>
        )}
      </div>

      {/* 큰 버튼 입력 영역 */}
      <div className="large-input-area">
        <div className="quick-buttons-grid-elderly">
          <button 
            className="large-question-btn"
            onClick={() => handleQuickQuestion('어디로 가야 하나요?')}
            disabled={isLoading}
          >
            <span className="btn-icon-large">🏥</span>
            <span className="btn-text-large">어디로 가야 하나요?</span>
          </button>
          
          <button 
            className="large-question-btn"
            onClick={() => handleQuickQuestion('얼마나 기다려야 하나요?')}
            disabled={isLoading}
          >
            <span className="btn-icon-large">⏰</span>
            <span className="btn-text-large">얼마나 기다려야 하나요?</span>
          </button>
          
          <button 
            className="large-question-btn"
            onClick={() => handleQuickQuestion('뭘 준비해야 하나요?')}
            disabled={isLoading}
          >
            <span className="btn-icon-large">📋</span>
            <span className="btn-text-large">뭘 준비해야 하나요?</span>
          </button>
          
          <button 
            className="large-question-btn"
            onClick={() => handleQuickQuestion('약은 어디서 받나요?')}
            disabled={isLoading}
          >
            <span className="btn-icon-large">💊</span>
            <span className="btn-text-large">약은 어디서 받나요?</span>
          </button>
        </div>
        
        {/* 음성 입력 버튼 */}
        <div className="voice-input-section">
          <button 
            className={`voice-input-btn-huge ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceInput}
            disabled={isLoading}
          >
            <div className={`voice-animation ${isListening ? 'active' : ''}`}>
              {isListening ? (
                <>
                  <div className="pulse-ring"></div>
                  <span className="voice-icon recording">🔴</span>
                </>
              ) : (
                <span className="voice-icon">🎤</span>
              )}
            </div>
            <span className="voice-text">
              {isListening ? '듣고 있어요... 말씀해 주세요' : '말씀해 주세요'}
            </span>
          </button>
          
          {/* 응급 도움 버튼 */}
          <button className="emergency-btn-huge" onClick={handleEmergencyHelp}>
            <span className="emergency-icon">🚨</span>
            <span className="emergency-text">도움이 필요해요</span>
          </button>
        </div>
      </div>

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="loading-overlay-elderly">
          <div className="loading-spinner-large"></div>
          <div className="loading-text-large">답변을 준비하고 있어요...</div>
        </div>
      )}
    </div>
  );
};

export default ElderlyMode;