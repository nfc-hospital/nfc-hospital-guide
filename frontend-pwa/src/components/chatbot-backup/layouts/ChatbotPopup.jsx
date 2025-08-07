import { useState, useEffect, useRef } from 'react';
import Header from '../core/Header';
import MessageList from '../core/MessageList';
import InputArea from '../core/InputArea';

const ChatbotPopup = ({ 
  isOpen, 
  onClose, 
  onSendMessage, 
  messages = [], 
  isLoading = false 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const popupRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  // 모바일 환경 감지
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsFullscreen(true); // 모바일에서는 항상 전체화면
        setPosition({ x: 0, y: 0 });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 드래그 이벤트 처리
  const handleMouseDown = (e) => {
    if (isMobile || isFullscreen) return;
    
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 380, dragRef.current.startPosX + deltaX)),
      y: Math.max(0, Math.min(window.innerHeight - 600, dragRef.current.startPosY + deltaY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // 접근성 이벤트 처리
  useEffect(() => {
    const handleAccessibilityToggle = (event) => {
      const { type } = event.detail;
      // 접근성 설정 처리 로직
      console.log('Accessibility toggle:', type);
    };

    const handleClearChat = () => {
      // 채팅 내용 지우기
      window.dispatchEvent(new CustomEvent('chatbot-clear-messages'));
    };

    window.addEventListener('accessibility-toggle', handleAccessibilityToggle);
    window.addEventListener('clear-chat', handleClearChat);

    return () => {
      window.removeEventListener('accessibility-toggle', handleAccessibilityToggle);
      window.removeEventListener('clear-chat', handleClearChat);
    };
  }, []);

  if (!isOpen) return null;

  const getPopupClasses = () => {
    let classes = 'chatbot-popup';
    if (isMinimized) classes += ' minimized';
    if (isFullscreen || isMobile) classes += ' fullscreen';
    if (isDragging) classes += ' dragging';
    return classes;
  };

  const getPopupStyle = () => {
    if (isMobile || isFullscreen) {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999
      };
    }
    
    return {
      position: 'fixed',
      bottom: `${position.y}px`,
      right: `${position.x}px`,
      width: '380px',
      height: isMinimized ? '64px' : '600px',
      zIndex: 9999,
      transition: isDragging ? 'none' : 'height 0.3s ease'
    };
  };

  return (
    <>
      {/* 배경 오버레이 (전체화면 모드 시) */}
      {(isFullscreen || isMobile) && (
        <div className="chatbot-overlay" onClick={onClose} />
      )}
      
      <div 
        ref={popupRef}
        className={getPopupClasses()}
        style={getPopupStyle()}
      >
        {/* 헤더 */}
        <div 
          className="popup-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <Header
            onClose={onClose}
            onMinimize={() => setIsMinimized(!isMinimized)}
            onMaximize={() => setIsFullscreen(!isFullscreen)}
            isMinimized={isMinimized}
            isFullscreen={isFullscreen || isMobile}
            showControls={true}
          />
        </div>

        {/* 메인 콘텐츠 */}
        {!isMinimized && (
          <div className="popup-content">
            {/* 메시지 리스트 */}
            <div className="messages-section">
              <MessageList 
                messages={messages}
                isLoading={isLoading}
                typingIndicator={isLoading}
              />
            </div>

            {/* 입력 영역 */}
            <div className="input-section">
              <InputArea 
                onSendMessage={onSendMessage}
                disabled={isLoading}
                placeholder="궁금한 것을 물어보세요..."
              />
            </div>
          </div>
        )}

        {/* 리사이즈 핸들 (데스크톱 모드에서만) */}
        {!isMobile && !isFullscreen && !isMinimized && (
          <div className="resize-handle">
            <div className="resize-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbotPopup;