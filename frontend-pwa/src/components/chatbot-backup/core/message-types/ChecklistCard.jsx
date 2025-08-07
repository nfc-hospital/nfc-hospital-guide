import { useState } from 'react';

const ChecklistCard = ({ message }) => {
  const [checkedItems, setCheckedItems] = useState(new Set());
  const checklistData = message.checklistData || {};
  const items = checklistData.items || [];

  const handleItemToggle = (index) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(index)) {
      newCheckedItems.delete(index);
    } else {
      newCheckedItems.add(index);
    }
    setCheckedItems(newCheckedItems);

    // 체크리스트 상태 변경 이벤트 발송
    window.dispatchEvent(new CustomEvent('checklist-updated', {
      detail: {
        checklistId: checklistData.id,
        completedItems: Array.from(newCheckedItems),
        totalItems: items.length,
        progress: (newCheckedItems.size / items.length) * 100
      }
    }));
  };

  const getProgressPercentage = () => {
    if (items.length === 0) return 0;
    return Math.round((checkedItems.size / items.length) * 100);
  };

  const getItemIcon = (item) => {
    if (item.type === 'required') return '🔴';
    if (item.type === 'recommended') return '🟡';
    if (item.type === 'optional') return '⚪';
    return '📝';
  };

  const getItemPriority = (item) => {
    switch (item.type) {
      case 'required':
        return 'required';
      case 'recommended':
        return 'recommended';
      case 'optional':
        return 'optional';
      default:
        return 'default';
    }
  };

  return (
    <div className="checklist-card">
      <div className="card-header">
        <h3 className="card-title">
          ✅ {checklistData.title || '검사 준비사항'}
        </h3>
        <div className="progress-indicator">
          <div className="progress-circle">
            <span className="progress-text">
              {getProgressPercentage()}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="card-divider"></div>
      
      {/* 진행률 바 */}
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
        <div className="progress-label">
          {checkedItems.size} / {items.length} 완료
        </div>
      </div>
      
      {/* 체크리스트 아이템들 */}
      <div className="checklist-items">
        {items.map((item, index) => (
          <div 
            key={index}
            className={`checklist-item ${getItemPriority(item)} ${checkedItems.has(index) ? 'checked' : ''}`}
          >
            <button
              className="item-checkbox"
              onClick={() => handleItemToggle(index)}
              aria-label={`${item.text} ${checkedItems.has(index) ? '완료됨' : '미완료'}`}
            >
              <div className="checkbox-icon">
                {checkedItems.has(index) ? '✅' : '☐'}
              </div>
            </button>
            
            <div className="item-content">
              <div className="item-header">
                <span className="item-icon">
                  {getItemIcon(item)}
                </span>
                <span className="item-text">
                  {item.text}
                </span>
                {item.type === 'required' && (
                  <span className="required-badge">필수</span>
                )}
              </div>
              
              {item.description && (
                <div className="item-description">
                  {item.description}
                </div>
              )}
              
              {item.tip && (
                <div className="item-tip">
                  💡 {item.tip}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="card-divider"></div>
      
      {/* 하단 안내 */}
      <div className="checklist-footer">
        <div className="completion-status">
          {getProgressPercentage() === 100 ? (
            <div className="completion-celebration">
              🎉 모든 준비가 완료되었습니다!
            </div>
          ) : (
            <div className="completion-reminder">
              💭 체크리스트를 확인하여 검사에 차질이 없도록 준비해주세요
            </div>
          )}
        </div>
        
        {checklistData.additionalNotes && (
          <div className="additional-notes">
            <div className="notes-header">📌 추가 안내사항</div>
            <div className="notes-content">
              {checklistData.additionalNotes}
            </div>
          </div>
        )}
        
        {checklistData.contactInfo && (
          <div className="contact-info">
            <span className="contact-label">문의:</span>
            <button 
              className="contact-button"
              onClick={() => window.open(`tel:${checklistData.contactInfo.phone}`)}
            >
              📞 {checklistData.contactInfo.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistCard;