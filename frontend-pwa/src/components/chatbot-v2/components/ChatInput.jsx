import React, { useState, useRef } from 'react';

const ChatInput = ({ onSendMessage, elderlyMode, disabled = false }) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef(null);

  const handleSend = () => {
    if (inputText.trim() && !disabled) {
      onSendMessage(inputText.trim());
      setInputText('');
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
    if (!('webkitSpeechRecognition' in window)) {
      alert('이 브라우저에서는 음성 인식을 지원하지 않습니다.');
      return;
    }

    if (isRecording) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsRecording(true);

    recognition.onstart = () => {
      console.log('음성 인식 시작');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsRecording(false);
      inputRef.current?.focus();
    };

    recognition.onerror = (event) => {
      console.error('음성 인식 오류:', event.error);
      setIsRecording(false);
      alert('음성 인식에 실패했습니다. 다시 시도해 주세요.');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  return (
    <div className={`chat-input-container ${elderlyMode ? 'elderly-mode' : ''}`}>
      <div className="input-wrapper">
        <button
          className={`voice-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleVoiceInput}
          disabled={disabled || isRecording}
          aria-label={isRecording ? '음성 인식 중' : '음성 입력'}
        >
          {isRecording ? '🔴' : '🎤'}
        </button>
        
        <textarea
          ref={inputRef}
          className="text-input"
          placeholder={disabled ? '응답을 기다리는 중...' : '메시지를 입력하세요...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          rows="1"
          style={{
            resize: 'none',
            overflow: 'hidden'
          }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!inputText.trim() || disabled}
          aria-label="메시지 전송"
        >
          {disabled ? '⏳' : '📤'}
        </button>
      </div>
      
      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-pulse"></span>
          음성을 듣고 있습니다...
        </div>
      )}
    </div>
  );
};

export default ChatInput;