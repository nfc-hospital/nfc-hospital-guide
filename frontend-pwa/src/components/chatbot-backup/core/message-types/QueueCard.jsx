const QueueCard = ({ message }) => {
  const queueData = message.queueData || {};
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'called':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'urgent':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting':
        return '대기 중';
      case 'called':
        return '호출됨';
      case 'urgent':
        return '긴급';
      default:
        return '확인 중';
    }
  };

  return (
    <div className="queue-card">
      <div className="card-header">
        <h3 className="card-title">
          🏥 현재 대기 상태
        </h3>
        <span className={`status-badge ${getStatusColor(queueData.status)}`}>
          {getStatusText(queueData.status)}
        </span>
      </div>
      
      <div className="card-divider"></div>
      
      <div className="queue-info">
        <div className="info-row">
          <span className="label">대기번호:</span>
          <span className="value large-number">
            {queueData.queueNumber || 'N/A'}번
          </span>
        </div>
        
        <div className="info-row">
          <span className="label">내 앞 대기:</span>
          <span className="value">
            {queueData.beforeMe || '계산 중'}명
          </span>
        </div>
        
        <div className="info-row">
          <span className="label">예상시간:</span>
          <span className="value">
            약 {queueData.estimatedWaitTime || '계산 중'}분
          </span>
        </div>
        
        {queueData.location && (
          <div className="info-row">
            <span className="label">대기장소:</span>
            <span className="value">
              {queueData.location}
            </span>
          </div>
        )}
      </div>
      
      <div className="card-divider"></div>
      
      <div className="queue-footer">
        <div className="warning-notice">
          ⚠️ 참고용 정보입니다
        </div>
        <div className="notice-text">
          실제 대기시간은 상황에 따라 변동될 수 있습니다
        </div>
        
        {queueData.status === 'called' && (
          <div className="urgent-action">
            <div className="pulse-animation">
              🔔 지금 입실해주세요!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueCard;