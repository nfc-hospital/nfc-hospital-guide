import { useState } from 'react';

const Header = ({ 
  onClose, 
  onMinimize, 
  onMaximize, 
  isMinimized = false, 
  isFullscreen = false,
  title = "AI 병원 도우미",
  subtitle = "검사 안내 및 병원 정보",
  showControls = true
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingsToggle = () => {
    setShowSettings(!showSettings);
  };

  const handleAccessibilityToggle = (type) => {
    // 접근성 설정 이벤트 발송
    window.dispatchEvent(new CustomEvent('accessibility-toggle', {
      detail: { type }
    }));
  };

  const renderSettingsMenu = () => {
    if (!showSettings) return null;

    return (
      <div className="settings-dropdown">
        <div className="settings-section">
          <div className="section-title">접근성</div>
          <button 
            className="settings-item"
            onClick={() => handleAccessibilityToggle('fontSize')}
          >
            <span className="item-icon">🔍</span>
            <span className="item-text">글자 크기 변경</span>
          </button>
          <button 
            className="settings-item"
            onClick={() => handleAccessibilityToggle('highContrast')}
          >
            <span className="item-icon">🌓</span>
            <span className="item-text">고대비 모드</span>
          </button>
          <button 
            className="settings-item"
            onClick={() => handleAccessibilityToggle('voice')}
          >
            <span className="item-icon">🔊</span>
            <span className="item-text">음성 읽기</span>
          </button>
        </div>
        
        <div className="settings-divider"></div>
        
        <div className="settings-section">
          <div className="section-title">기타</div>
          <button 
            className="settings-item"
            onClick={() => {
              // 대화 내용 초기화
              window.dispatchEvent(new CustomEvent('clear-chat'));
              setShowSettings(false);
            }}
          >
            <span className="item-icon">🗑️</span>
            <span className="item-text">대화 내용 지우기</span>
          </button>
          <button 
            className="settings-item"
            onClick={() => {
              // 피드백 보내기
              window.dispatchEvent(new CustomEvent('show-feedback'));
              setShowSettings(false);
            }}
          >
            <span className="item-icon">💬</span>
            <span className="item-text">피드백 보내기</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`chatbot-header ${isMinimized ? 'minimized' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* 메인 헤더 내용 */}
      <div className="header-content">
        <div className="header-left">
          <div className="chatbot-avatar">
            <div className="avatar-icon">🤖</div>
            <div className="status-indicator online"></div>
          </div>
          
          <div className="header-info">
            <h2 className="chatbot-title">{title}</h2>
            {!isMinimized && (
              <div className="chatbot-status">
                <span className="status-text">{subtitle}</span>
                <div className="typing-status">
                  {/* 타이핑 상태가 있을 때 표시 */}
                </div>
              </div>
            )}
          </div>
        </div>

        {showControls && (
          <div className="header-controls">
            {/* 설정 버튼 */}
            <div className="settings-container">
              <button
                className={`control-btn settings-btn ${showSettings ? 'active' : ''}`}
                onClick={handleSettingsToggle}
                aria-label="설정 메뉴"
                aria-expanded={showSettings}
              >
                <span className="control-icon">⚙️</span>
              </button>
              {renderSettingsMenu()}
            </div>

            {/* 최소화/최대화 버튼 */}
            {!isFullscreen && (
              <button
                className="control-btn minimize-btn"
                onClick={onMinimize}
                aria-label={isMinimized ? '챗봇 펼치기' : '챗봇 접기'}
              >
                <span className="control-icon">
                  {isMinimized ? '🔼' : '🔽'}
                </span>
              </button>
            )}

            {/* 전체화면 버튼 (데스크톱에서만) */}
            {window.innerWidth >= 768 && (
              <button
                className="control-btn maximize-btn"
                onClick={onMaximize}
                aria-label={isFullscreen ? '창 모드' : '전체화면'}
              >
                <span className="control-icon">
                  {isFullscreen ? '🗗' : '🗖'}
                </span>
              </button>
            )}

            {/* 닫기 버튼 */}
            <button
              className="control-btn close-btn"
              onClick={onClose}
              aria-label="챗봇 닫기"
            >
              <span className="control-icon">✕</span>
            </button>
          </div>
        )}
      </div>

      {/* 헤더 하단 정보 (확장 시에만 표시) */}
      {!isMinimized && (
        <div className="header-bottom">
          <div className="connection-status">
            <div className="status-indicator connected"></div>
            <span className="status-text">연결됨</span>
          </div>
          
          <div className="current-location">
            <span className="location-icon">📍</span>
            <span className="location-text">본관 1층 안내데스크</span>
          </div>
        </div>
      )}

      {/* 설정 메뉴 오버레이 (모바일에서 닫기 위함) */}
      {showSettings && (
        <div 
          className="settings-overlay"
          onClick={() => setShowSettings(false)}
        ></div>
      )}
    </div>
  );
};

export default Header;