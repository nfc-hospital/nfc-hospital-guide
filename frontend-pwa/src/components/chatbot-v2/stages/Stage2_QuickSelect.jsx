import React, { useState, useEffect, useRef } from 'react';
import './styles/stage2.css';

const Stage2_QuickSelect = ({ 
  elderlyMode, 
  onClose, 
  onSelectQuestion,
  position 
}) => {
  const [isExpanding, setIsExpanding] = useState(true);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef(null);
  
  const quickQuestions = [
    { icon: '⏰', text: '대기 시간', question: '지금 내 대기 순서와 예상 시간이 궁금합니다' },
    { icon: '📋', text: '검사 준비사항', question: '오늘 받을 검사의 준비사항을 알려주세요' },
    { icon: '🏥', text: '진료 순서', question: '오늘 진료 순서를 알려주세요' },
    { icon: '🚺', text: '화장실 위치', question: '가장 가까운 화장실이 어디에 있나요?' },
    { icon: '☕', text: '편의시설', question: '병원 내 카페나 편의점이 있나요?' },
    { icon: '📞', text: '병원 연락처', question: '병원 대표번호와 진료과 연락처를 알려주세요' }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsExpanding(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputText.trim()) {
      onSelectQuestion(inputText.trim());
    }
  };

  const handleSendText = () => {
    if (inputText.trim()) {
      onSelectQuestion(inputText.trim());
    }
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        inputRef.current?.focus();
      };

      recognition.onerror = (event) => {
        console.error('음성 인식 오류:', event.error);
        alert('음성 인식에 실패했습니다. 다시 시도해 주세요.');
      };

      recognition.start();
    } else {
      alert('이 브라우저에서는 음성 인식을 지원하지 않습니다.');
    }
  };

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="chatbot-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(2px)',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-out'
        }}
      />
      
      <div className={`
        quick-select-stage2
        ${elderlyMode ? 'elderly-mode' : ''}
        ${isExpanding ? 'expanding' : 'expanded'}
      `}
      style={{
        position: 'fixed',
        bottom: `${position.y}px`,
        right: `${position.x}px`
      }}>
        <div className="popup-header">
        <h2>무엇을 도와드릴까요?</h2>
        <button className="close-btn" onClick={onClose} aria-label="닫기">✕</button>
      </div>

      <div className="quick-buttons-grid">
        {quickQuestions.map((item, idx) => (
          <button
            key={idx}
            className="quick-button"
            onClick={() => onSelectQuestion(item.question)}
            aria-label={`${item.text} 질문하기`}
          >
            <span className="emoji">{item.icon}</span>
            <span className="label">{item.text}</span>
          </button>
        ))}
      </div>

      <div className="input-section">
        <button 
          className="voice-input-btn"
          onClick={handleVoiceInput}
          aria-label="음성으로 질문하기"
        >
          <span className="mic-icon">🎤</span>
          <span>말로 질문하기</span>
        </button>
        
        <div className="text-input-wrapper">
          <input 
            ref={inputRef}
            type="text"
            placeholder="직접 입력하세요..."
            className="text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            aria-label="질문 입력"
          />
          <button 
            className="send-btn"
            onClick={handleSendText}
            disabled={!inputText.trim()}
            aria-label="질문 전송"
          >
            →
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default Stage2_QuickSelect;