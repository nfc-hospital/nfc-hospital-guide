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
        right: `${position.x}px`
      }}
      aria-label="챗봇 열기"
    >
      <div className="button-content">
        <span className="icon">💬</span>
        {elderlyMode && <span className="text">도움</span>}
      </div>
      {hasNewMessage && <span className="notification-dot" />}
    </button>
  );
};

export default Stage1_FloatingButton;