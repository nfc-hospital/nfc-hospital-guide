import { useState, useRef, useEffect } from 'react';

const InputArea = ({ onSendMessage, disabled, placeholder = "메시지를 입력하세요..." }) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
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
        setInputValue(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleSend = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !disabled) {
      onSendMessage(trimmedValue);
      setInputValue('');
      inputRef.current?.focus();
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

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const renderQuickReplies = () => {
    const quickReplies = [
      { icon: '📍', text: '위치 찾기', action: 'location' },
      { icon: '⏰', text: '대기 현황', action: 'queue' },
      { icon: '📋', text: '준비사항', action: 'preparation' },
      { icon: '💊', text: '약국 위치', action: 'pharmacy' }
    ];

    return (
      <div className="quick-replies-container">
        <div className="quick-replies-label">빠른 질문</div>
        <div className="quick-replies-grid">
          {quickReplies.map((reply, index) => (
            <button
              key={index}
              className="quick-reply-chip"
              onClick={() => {
                onSendMessage(reply.text);
              }}
              disabled={disabled}
            >
              <span className="chip-icon">{reply.icon}</span>
              <span className="chip-text">{reply.text}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="input-area-container">
      {/* 빠른 답변 버튼들 */}
      {!isFocused && renderQuickReplies()}
      
      {/* 메인 입력 영역 */}
      <div className={`input-area ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
        <div className="input-wrapper">
          {/* 텍스트 입력 */}
          <textarea
            ref={inputRef}
            className="message-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={disabled ? '잠시 기다려주세요...' : placeholder}
            disabled={disabled}
            rows={1}
            style={{
              resize: 'none',
              height: 'auto',
              minHeight: '44px',
              maxHeight: '120px'
            }}
            onInput={(e) => {
              // 자동 높이 조절
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />

          {/* 우측 버튼들 */}
          <div className="input-actions">
            {/* 음성 입력 버튼 */}
            <button
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleVoiceInput}
              disabled={disabled}
              aria-label={isRecording ? '음성 인식 중지' : '음성 입력 시작'}
              title={isRecording ? '음성 인식 중지' : '음성 입력'}
            >
              {isRecording ? (
                <div className="recording-indicator">
                  <span className="recording-pulse">🔴</span>
                </div>
              ) : (
                <span className="mic-icon">🎤</span>
              )}
            </button>

            {/* 전송 버튼 */}
            <button
              className={`send-btn ${inputValue.trim() ? 'active' : ''}`}
              onClick={handleSend}
              disabled={disabled || !inputValue.trim()}
              aria-label="메시지 전송"
            >
              <span className="send-icon">📤</span>
            </button>
          </div>
        </div>

        {/* 입력 도움말 */}
        {isFocused && (
          <div className="input-helper">
            <div className="helper-text">
              Enter로 전송, Shift+Enter로 줄바꿈
            </div>
            <div className="char-counter">
              {inputValue.length}/500
            </div>
          </div>
        )}
      </div>

      {/* 음성 인식 상태 */}
      {isRecording && (
        <div className="voice-recording-status">
          <div className="recording-animation">
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
          </div>
          <div className="recording-text">음성을 말씀해 주세요...</div>
          <button 
            className="stop-recording-btn"
            onClick={() => recognitionRef.current?.stop()}
          >
            중지
          </button>
        </div>
      )}
    </div>
  );
};

export default InputArea;