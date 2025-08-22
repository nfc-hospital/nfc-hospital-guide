import React from 'react';

const MessageBubble = ({ message, elderlyMode }) => {
  const { type, text, timestamp, structuredData } = message;
  const isUser = type === 'user';
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const renderStructuredContent = () => {
    if (!structuredData) return text;

    switch (structuredData.type) {
      case 'hospital_info':
        return (
          <div className="info-cards">
            {structuredData.content.map((item, idx) => (
              <div key={idx} className="info-card">
                <span className="card-icon">{item.icon}</span>
                <div className="card-content">
                  <div className="card-label">{item.label}</div>
                  <div className="card-value">
                    {item.action ? (
                      <a href={item.action} className="card-link">{item.value}</a>
                    ) : (
                      item.value
                    )}
                  </div>
                  {item.detail && <div className="card-detail">{item.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'queue_status':
        return (
          <div className="queue-status-card">
            <div className="queue-header">
              <h3>{structuredData.content.title}</h3>
              {structuredData.called && <span className="called-badge">🔔 호출됨</span>}
            </div>
            <div className="queue-metrics">
              <div className="metric">
                <div className="metric-value">{structuredData.content.peopleAhead}</div>
                <div className="metric-label">내 앞 대기</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric">
                <div className="metric-value">{structuredData.content.waitTime}분</div>
                <div className="metric-label">예상 시간</div>
              </div>
            </div>
            {structuredData.called && (
              <div className="called-message">
                검사실로 입장해 주세요
              </div>
            )}
          </div>
        );

      case 'payment_info':
        return (
          <div className="payment-card">
            <div className="payment-header">
              <span className="payment-icon">💳</span>
              <h3>진료비 안내</h3>
            </div>
            <div className="payment-info">
              <div className="info-row">
                <span className="info-label">완료된 검사</span>
                <span className="info-value">{structuredData.content.completed}건</span>
              </div>
              <div className="info-row">
                <span className="info-label">수납 위치</span>
                <span className="info-value">{structuredData.content.location}</span>
              </div>
            </div>
            <div className="payment-methods">
              {structuredData.content.methods.map((method, idx) => (
                <span key={idx} className="method-badge">{method}</span>
              ))}
            </div>
          </div>
        );

      case 'facilities':
        return (
          <div className="facilities-grid">
            {structuredData.content.map((facility, idx) => (
              <div key={idx} className="facility-card">
                <div className="facility-icon">{facility.icon}</div>
                <div className="facility-info">
                  <div className="facility-name">{facility.name}</div>
                  <div className="facility-location">{facility.location}</div>
                  <div className="facility-hours">{facility.hours}</div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'parking':
        return (
          <div className="parking-card">
            <div className="parking-header">
              <span className="parking-icon">🚗</span>
              <h3>주차 안내</h3>
            </div>
            <div className="parking-info">
              <div className="parking-item">
                <span className="parking-label">위치</span>
                <span className="parking-value">{structuredData.content.location}</span>
              </div>
              <div className="parking-item">
                <span className="parking-label">무료시간</span>
                <span className="parking-value">{structuredData.content.freeTime}</span>
              </div>
              <div className="parking-item">
                <span className="parking-label">요금</span>
                <span className="parking-value">{structuredData.content.rate}</span>
              </div>
              <div className="parking-item highlight">
                <span className="parking-label">할인</span>
                <span className="parking-value">{structuredData.content.discount}</span>
              </div>
            </div>
            <div className="parking-hours">🕰️ {structuredData.content.hours} 운영</div>
          </div>
        );

      case 'simple':
        return (
          <div className="simple-message">
            {structuredData.content}
          </div>
        );

      case 'default':
        return (
          <div className="default-message">
            <p>{structuredData.content}</p>
            <div className="quick-actions">
              <button className="quick-action-btn">대기 시간</button>
              <button className="quick-action-btn">병원 정보</button>
              <button className="quick-action-btn">진료비</button>
            </div>
          </div>
        );

      default:
        return text;
    }
  };

  return (
    <div className={`message-wrapper ${isUser ? 'user-message' : 'bot-message'} ${elderlyMode ? 'elderly-mode' : ''}`}>
      <div className="message-bubble">
        {!isUser && (
          <div className="bot-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="white"/>
              <path d="M12 2C10.6868 2 9.38642 2.25866 8.17317 2.7612C6.95991 3.26375 5.85752 4.00035 4.92893 4.92893C3.05357 6.8043 2 9.34784 2 12C2 14.6522 3.05357 17.1957 4.92893 19.0711C5.85752 19.9997 6.95991 20.7362 8.17317 21.2388C9.38642 21.7413 10.6868 22 12 22C14.6522 22 17.1957 20.9464 19.0711 19.0711C20.9464 17.1957 22 14.6522 22 12C22 10.6868 21.7413 9.38642 21.2388 8.17317C20.7362 6.95991 19.9997 5.85752 19.0711 4.92893C18.1425 4.00035 17.0401 3.26375 15.8268 2.7612C14.6136 2.25866 13.3132 2 12 2ZM8 11H10V16H8V11ZM14 11H16V16H14V11ZM12 8C11.7348 8 11.4804 7.89464 11.2929 7.70711C11.1054 7.51957 11 7.26522 11 7C11 6.73478 11.1054 6.48043 11.2929 6.29289C11.4804 6.10536 11.7348 6 12 6C12.2652 6 12.5196 6.10536 12.7071 6.29289C12.8946 6.48043 13 6.73478 13 7C13 7.26522 12.8946 7.51957 12.7071 7.70711C12.5196 7.89464 12.2652 8 12 8Z" fill="#3B82F6"/>
            </svg>
          </div>
        )}
        <div className="message-content">
          <div className="message-text">
            {renderStructuredContent()}
          </div>
          <div className="message-time">
            {formatTime(timestamp)}
          </div>
        </div>
        {isUser && (
          <div className="user-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="white"/>
              <path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" fill="#10B981"/>
              <path d="M12 14C8.685 14 6 16.685 6 20H18C18 16.685 15.315 14 12 14Z" fill="#10B981"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;