import { useState } from 'react';
import TextMessage from './message-types/TextMessage';
import CardMessage from './message-types/CardMessage';
import LocationCard from './message-types/LocationCard';
import QueueCard from './message-types/QueueCard';
import ChecklistCard from './message-types/ChecklistCard';
import WarningMessage from './message-types/WarningMessage';
import MessageMeta from './MessageMeta';

const MessageBubble = ({ message, type = 'bot' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderContent = () => {
    const contentType = message.contentType || 'text';
    
    switch(contentType) {
      case 'text':
        return <TextMessage message={message} />;
      case 'card':
        return <CardMessage message={message} />;
      case 'location':
        return <LocationCard message={message} />;
      case 'queue':
        return <QueueCard message={message} />;
      case 'checklist':
        return <ChecklistCard message={message} />;
      case 'warning':
        return <WarningMessage message={message} />;
      default:
        return <TextMessage message={message} />;
    }
  };

  const getBubbleClasses = () => {
    const baseClasses = "message-bubble";
    const typeClass = type === 'user' ? 'user-bubble' : 'bot-bubble';
    const contentClass = `content-${message.contentType || 'text'}`;
    const priorityClass = message.priority ? `priority-${message.priority}` : '';
    
    return `${baseClasses} ${typeClass} ${contentClass} ${priorityClass}`.trim();
  };

  return (
    <div className={getBubbleClasses()}>
      <div className="bubble-content">
        {renderContent()}
        
        {/* 면책조항 표시 */}
        {message.disclaimer && (
          <div className="disclaimer-section">
            <div className="disclaimer-toggle" onClick={() => setIsExpanded(!isExpanded)}>
              <span className="disclaimer-icon">⚠️</span>
              <span className="disclaimer-text">중요 안내사항</span>
              <span className={`disclaimer-arrow ${isExpanded ? 'expanded' : ''}`}>
                ▼
              </span>
            </div>
            {isExpanded && (
              <div className="disclaimer-content">
                {message.disclaimer}
              </div>
            )}
          </div>
        )}
        
        {/* 관련 정보 표시 */}
        {message.relatedInfo && (
          <div className="related-info">
            {message.relatedInfo.preparation && (
              <div className="info-section">
                <strong>준비사항:</strong>
                <ul>
                  {message.relatedInfo.preparation.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {message.relatedInfo.location && (
              <div className="info-section">
                <strong>위치:</strong> {message.relatedInfo.location}
              </div>
            )}
          </div>
        )}
      </div>
      
      <MessageMeta 
        timestamp={message.time || message.timestamp} 
        status={message.status}
        type={type}
      />
    </div>
  );
};

export default MessageBubble;