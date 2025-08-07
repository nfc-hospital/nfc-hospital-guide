const WarningMessage = ({ message }) => {
  const warningData = message.warningData || {};
  
  const getWarningLevel = () => {
    switch (warningData.level) {
      case 'error':
        return { icon: '🚫', color: 'error', label: '오류' };
      case 'warning':
        return { icon: '⚠️', color: 'warning', label: '주의' };
      case 'info':
        return { icon: 'ℹ️', color: 'info', label: '안내' };
      case 'medical':
        return { icon: '⚕️', color: 'medical', label: '의료 안내' };
      default:
        return { icon: '💡', color: 'default', label: '알림' };
    }
  };

  const handleActionClick = (action) => {
    window.dispatchEvent(new CustomEvent('warning-action', {
      detail: {
        action: action.type,
        data: action.data,
        warningId: warningData.id
      }
    }));
  };

  const warningLevel = getWarningLevel();

  return (
    <div className={`warning-message ${warningLevel.color}`}>
      <div className="warning-container">
        {/* 경고 헤더 */}
        <div className="warning-header">
          <div className="warning-icon-large">
            {warningLevel.icon}
          </div>
          <div className="warning-title-section">
            <div className="warning-level-badge">
              {warningLevel.label}
            </div>
            <h3 className="warning-title">
              {warningData.title || '중요 안내사항'}
            </h3>
          </div>
        </div>

        <div className="card-divider"></div>

        {/* 경고 내용 */}
        <div className="warning-content">
          <div className="warning-message-text">
            {warningData.message || message.text}
          </div>

          {/* 세부 내용 */}
          {warningData.details && warningData.details.length > 0 && (
            <div className="warning-details">
              <div className="details-header">자세한 내용</div>
              <ul className="details-list">
                {warningData.details.map((detail, index) => (
                  <li key={index} className="detail-item">
                    <span className="detail-bullet">•</span>
                    <span className="detail-text">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 의료 면책 조항 */}
          {warningData.level === 'medical' && (
            <div className="medical-disclaimer">
              <div className="disclaimer-header">
                <span className="disclaimer-icon">⚖️</span>
                <span className="disclaimer-title">의료 면책조항</span>
              </div>
              <div className="disclaimer-content">
                이 정보는 참고용이며 정확한 진단과 치료를 위해서는 반드시 의료진과 상담하시기 바랍니다.
              </div>
            </div>
          )}

          {/* 긴급 연락처 */}
          {warningData.emergencyContact && (
            <div className="emergency-contact">
              <div className="contact-header">
                <span className="contact-icon">📞</span>
                <span className="contact-title">긴급 연락처</span>
              </div>
              <button 
                className="emergency-call-btn"
                onClick={() => window.open(`tel:${warningData.emergencyContact.phone}`)}
              >
                <span className="call-icon">🚨</span>
                <span className="call-text">{warningData.emergencyContact.name}</span>
                <span className="call-number">{warningData.emergencyContact.phone}</span>
              </button>
            </div>
          )}
        </div>

        {/* 액션 버튼들 */}
        {warningData.actions && warningData.actions.length > 0 && (
          <>
            <div className="card-divider"></div>
            <div className="warning-actions">
              {warningData.actions.map((action, index) => (
                <button
                  key={index}
                  className={`warning-action-btn ${action.style || 'primary'}`}
                  onClick={() => handleActionClick(action)}
                  aria-label={action.ariaLabel || action.label}
                >
                  {action.icon && <span className="action-icon">{action.icon}</span>}
                  <span className="action-label">{action.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* 하단 타임스탬프 */}
        {warningData.timestamp && (
          <div className="warning-footer">
            <div className="warning-timestamp">
              발생 시간: {new Date(warningData.timestamp).toLocaleString('ko-KR')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarningMessage;