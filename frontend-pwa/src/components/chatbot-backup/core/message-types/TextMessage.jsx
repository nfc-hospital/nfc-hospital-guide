const TextMessage = ({ message }) => {
  const text = message.text || message.content || '';
  
  // 텍스트에서 특수 패턴 감지 및 강조
  const formatText = (text) => {
    if (!text) return '';
    
    // 전화번호 패턴 감지
    const phonePattern = /(\d{2,3}-\d{3,4}-\d{4})/g;
    let formattedText = text.replace(phonePattern, '<span class="highlighted-phone">📞 $1</span>');
    
    // 시간 패턴 감지 (예: 09:00, 14:30)
    const timePattern = /(\d{1,2}:\d{2})/g;
    formattedText = formattedText.replace(timePattern, '<span class="highlighted-time">🕒 $1</span>');
    
    // 중요한 키워드 강조
    const importantKeywords = ['주의', '필수', '긴급', '중요', '준비', '금식'];
    importantKeywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      formattedText = formattedText.replace(regex, '<strong class="important-keyword">$1</strong>');
    });
    
    return formattedText;
  };

  const getMessagePriority = () => {
    if (message.priority === 'high') return 'high-priority';
    if (message.priority === 'urgent') return 'urgent-priority';
    if (message.priority === 'low') return 'low-priority';
    return 'normal-priority';
  };

  return (
    <div className={`text-message ${getMessagePriority()}`}>
      <div className="message-content">
        <div 
          className="message-text"
          dangerouslySetInnerHTML={{ 
            __html: formatText(text)
          }}
        />
        
        {/* 빠른 답변 제안 */}
        {message.quickReplies && message.quickReplies.length > 0 && (
          <div className="quick-replies">
            <div className="quick-replies-label">
              💬 빠른 답변
            </div>
            <div className="quick-replies-list">
              {message.quickReplies.map((reply, index) => (
                <button
                  key={index}
                  className="quick-reply-btn"
                  onClick={() => {
                    // 빠른 답변 선택 이벤트 발송
                    window.dispatchEvent(new CustomEvent('quick-reply-selected', {
                      detail: { reply: reply.text || reply, id: reply.id }
                    }));
                  }}
                >
                  {reply.icon && <span className="reply-icon">{reply.icon}</span>}
                  <span className="reply-text">{reply.text || reply}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 연관 액션 버튼 */}
        {message.actions && message.actions.length > 0 && (
          <div className="message-actions">
            {message.actions.map((action, index) => (
              <button
                key={index}
                className={`action-btn ${action.type || 'default'}`}
                onClick={() => {
                  // 액션 실행 이벤트 발송
                  window.dispatchEvent(new CustomEvent('message-action', {
                    detail: { 
                      action: action.action, 
                      data: action.data,
                      label: action.label 
                    }
                  }));
                }}
                aria-label={action.ariaLabel || action.label}
              >
                {action.icon && <span className="action-icon">{action.icon}</span>}
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextMessage;