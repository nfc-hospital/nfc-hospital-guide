import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ExamCard = ({ exam }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  
  const handleCardClick = () => {
    setExpanded(!expanded);
  };
  
  const handleGoButtonClick = (e) => {
    e.stopPropagation(); // 카드 클릭 이벤트 버블링 방지
    navigate(`/exam/${exam.id}`);
  };
  
  return (
    <div 
      className={`exam-card ${expanded ? 'expanded' : ''}`}
      onClick={handleCardClick}
    >
      <div className="exam-card-header">
        <div className="exam-time-badge">{exam.time}</div>
        <h3 className="exam-title">{exam.title}</h3>
        <div className="expand-icon">{expanded ? '▲' : '▼'}</div>
      </div>
      
      <div className="exam-card-content">
        <p className="exam-location">
          <span className="label">위치:</span> {exam.location}
        </p>
        
        {expanded && (
          <>
            <div className="exam-preparation">
              <span className="label">준비사항:</span>
              <p>{exam.preparation}</p>
            </div>
            
            <button 
              className="go-button"
              onClick={handleGoButtonClick}
            >
              바로 가기
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ExamCard;