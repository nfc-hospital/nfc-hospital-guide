const CardMessage = ({ message }) => {
  const cardData = message.cardData || {};
  
  const handleCardAction = (action) => {
    window.dispatchEvent(new CustomEvent('card-action', {
      detail: { 
        action: action.type,
        data: action.data,
        cardId: cardData.id
      }
    }));
  };

  const getCardIcon = () => {
    switch (cardData.type) {
      case 'appointment':
        return '📅';
      case 'exam':
        return '🔬';
      case 'doctor':
        return '👨‍⚕️';
      case 'department':
        return '🏥';
      case 'service':
        return '🛍️';
      case 'emergency':
        return '🚨';
      default:
        return '📋';
    }
  };

  const getCardPriority = () => {
    if (cardData.priority === 'high') return 'high-priority-card';
    if (cardData.priority === 'urgent') return 'urgent-priority-card';
    if (cardData.priority === 'low') return 'low-priority-card';
    return 'normal-priority-card';
  };

  return (
    <div className={`card-message ${getCardPriority()}`}>
      <div className="card-container">
        <div className="card-header">
          <div className="card-icon">
            {getCardIcon()}
          </div>
          <div className="card-title-section">
            <h3 className="card-title">
              {cardData.title || '정보 카드'}
            </h3>
            {cardData.subtitle && (
              <p className="card-subtitle">
                {cardData.subtitle}
              </p>
            )}
          </div>
          {cardData.badge && (
            <div className={`card-badge ${cardData.badge.type || 'default'}`}>
              {cardData.badge.text}
            </div>
          )}
        </div>

        <div className="card-divider"></div>

        <div className="card-body">
          {cardData.description && (
            <div className="card-description">
              {cardData.description}
            </div>
          )}

          {cardData.fields && cardData.fields.length > 0 && (
            <div className="card-fields">
              {cardData.fields.map((field, index) => (
                <div key={index} className="field-row">
                  <span className="field-label">
                    {field.icon && <span className="field-icon">{field.icon}</span>}
                    {field.label}:
                  </span>
                  <span className="field-value">
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {cardData.items && cardData.items.length > 0 && (
            <div className="card-items">
              {cardData.items.map((item, index) => (
                <div key={index} className="card-item">
                  {item.icon && <span className="item-icon">{item.icon}</span>}
                  <div className="item-content">
                    <div className="item-text">{item.text}</div>
                    {item.detail && (
                      <div className="item-detail">{item.detail}</div>
                    )}
                  </div>
                  {item.value && (
                    <div className="item-value">{item.value}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {cardData.image && (
            <div className="card-image">
              <img 
                src={cardData.image.url} 
                alt={cardData.image.alt || cardData.title}
                className="card-img"
              />
              {cardData.image.caption && (
                <div className="image-caption">
                  {cardData.image.caption}
                </div>
              )}
            </div>
          )}
        </div>

        {cardData.actions && cardData.actions.length > 0 && (
          <>
            <div className="card-divider"></div>
            <div className="card-actions">
              {cardData.actions.map((action, index) => (
                <button
                  key={index}
                  className={`card-action-btn ${action.style || 'primary'}`}
                  onClick={() => handleCardAction(action)}
                  aria-label={action.ariaLabel || action.label}
                >
                  {action.icon && <span className="action-icon">{action.icon}</span>}
                  <span className="action-label">{action.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {cardData.footnote && (
          <div className="card-footnote">
            <div className="footnote-icon">ℹ️</div>
            <div className="footnote-text">{cardData.footnote}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardMessage;