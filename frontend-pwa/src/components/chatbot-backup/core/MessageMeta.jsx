const MessageMeta = ({ timestamp, status, type }) => {
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    
    // 이미 포맷된 시간 문자열인지 확인
    if (typeof timeStr === 'string' && timeStr.includes(':')) {
      return timeStr;
    }
    
    // ISO 문자열이나 timestamp인 경우
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return '📤';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'error':
        return '❌';
      default:
        return '';
    }
  };

  return (
    <div className={`message-meta ${type}`}>
      <span className="timestamp">
        {formatTime(timestamp)}
      </span>
      {type === 'user' && (
        <span className="status-icon">
          {getStatusIcon()}
        </span>
      )}
    </div>
  );
};

export default MessageMeta;