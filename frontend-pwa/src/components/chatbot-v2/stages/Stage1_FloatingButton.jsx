import React, { useState, useEffect } from 'react';
import './styles/stage1.css';

const Stage1_FloatingButton = ({ 
  isActive, 
  elderlyMode, 
  onClick, 
  position 
}) => {
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPulsing(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isActive) return null;

  return (
    <button
      className={`
        floating-button-stage1
        ${elderlyMode ? 'elderly-size' : 'normal-size'}
        ${isPulsing ? 'pulsing' : ''}
        ${hasNewMessage ? 'has-notification' : ''}
      `}
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: `${position.y}px`,
        right: `${position.x}px`,
        transition: 'bottom 300ms ease-in-out'
      }}
      aria-label="챗봇 열기"
    >
      <div className="button-content">
        <svg className="icon" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 4C8.48 4 4 7.58 4 12C4 14.12 4.94 16.02 6.46 17.38L5.5 21.5C5.4 21.9 5.8 22.3 6.2 22.1L10.66 20.34C11.7 20.74 12.82 21 14 21C19.52 21 24 17.42 24 13C24 8.58 19.52 4 14 4Z" fill="white"/>
          <circle cx="9" cy="12" r="1.5" fill="#60A5FA"/>
          <circle cx="14" cy="12" r="1.5" fill="#3B82F6"/>
          <circle cx="19" cy="12" r="1.5" fill="#2563EB"/>
        </svg>
        {elderlyMode && <span className="text">도움</span>}
      </div>
      {hasNewMessage && <span className="notification-dot" />}
    </button>
  );
};

export default Stage1_FloatingButton;