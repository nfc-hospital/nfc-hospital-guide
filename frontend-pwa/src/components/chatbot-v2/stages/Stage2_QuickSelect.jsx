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
    { 
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="10" fill="#EBF5FF" stroke="#3B82F6" strokeWidth="2"/>
          <path d="M14 8V14L17.5 17.5" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="14" cy="14" r="1.5" fill="#3B82F6"/>
        </svg>
      ),
      text: '대기 시간', 
      question: '지금 내 대기 순서와 예상 시간이 궁금합니다' 
    },
    { 
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="5" width="16" height="18" rx="2" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2"/>
          <path d="M10 10H18M10 14H18M10 18H14" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="10" cy="3" r="1" fill="#F59E0B"/>
          <circle cx="18" cy="3" r="1" fill="#F59E0B"/>
          <path d="M10 3V7M18 3V7" stroke="#F59E0B" strokeWidth="2"/>
        </svg>
      ),
      text: '검사 준비사항', 
      question: '오늘 받을 검사의 준비사항을 알려주세요' 
    },
    { 
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 11V24H24V11L14 3L4 11Z" fill="#E0E7FF" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round"/>
          <rect x="11" y="17" width="6" height="7" fill="#6366F1"/>
          <rect x="7" y="13" width="4" height="4" fill="#6366F1" fillOpacity="0.5"/>
          <rect x="17" y="13" width="4" height="4" fill="#6366F1" fillOpacity="0.5"/>
          <circle cx="14" cy="10" r="2" fill="white"/>
        </svg>
      ),
      text: '진료 순서', 
      question: '오늘 진료 순서를 알려주세요' 
    },
    { 
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="8" width="18" height="15" rx="2" fill="#F0FDF4" stroke="#22C55E" strokeWidth="2"/>
          <path d="M5 12H23" stroke="#22C55E" strokeWidth="2"/>
          <circle cx="9" cy="10" r="1" fill="#22C55E"/>
          <circle cx="14" cy="10" r="1" fill="#22C55E"/>
          <circle cx="19" cy="10" r="1" fill="#22C55E"/>
          <path d="M9 16H12M16 16H19" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
          <path d="M9 19H19" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      text: '진료비 안내', 
      question: '오늘 진료비와 검사비용이 얼마나 나올까요?' 
    },
    { 
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="10" fill="#FEE2E2" stroke="#EF4444" strokeWidth="2"/>
          <path d="M14 9V15" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="14" cy="19" r="1.5" fill="#EF4444"/>
          <path d="M10 5L14 2L18 5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      text: '주의사항', 
      question: '검사 후 주의사항이 있나요?' 
    },
    { 
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="7" y="12" width="14" height="10" rx="2" fill="#E0E7FF" stroke="#6366F1" strokeWidth="2"/>
          <path d="M8 8C8 6.9 8.9 6 10 6H18C19.1 6 20 6.9 20 8V12H8V8Z" fill="#6366F1"/>
          <circle cx="10" cy="9" r="1" fill="white"/>
          <circle cx="14" cy="9" r="1" fill="white"/>
          <circle cx="18" cy="9" r="1" fill="white"/>
          <path d="M11 16H17M11 18H17" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      text: '병원 정보', 
      question: '병원 운영시간과 주요 연락처를 알려주세요' 
    }
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
            <span className="emoji">{item.iconSvg}</span>
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
          <svg className="mic-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="4" width="8" height="12" rx="4" fill="white" stroke="white" strokeWidth="2"/>
            <path d="M6 13C6 13 6 15 6 16C6 19.5 9 21 14 21C19 21 22 19.5 22 16C22 15 22 13 22 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M14 21V24M10 24H18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="14" cy="10" r="2" fill="#3B82F6" fillOpacity="0.3"/>
          </svg>
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