import { useState } from 'react';
import '../styles/ExamPreparation.css';

const ExamPreparation = ({ preparation, description }) => {
  const [preparationChecked, setPreparationChecked] = useState(false);
  
  const handleCheckboxChange = () => {
    setPreparationChecked(!preparationChecked);
  };
  
  return (
    <div className="section-container exam-preparation-container">
      <h3>검사 준비사항</h3>
      
      <div className="preparation-description">
        <p>{description}</p>
      </div>
      
      <div className="preparation-checklist">
        <label className="checkbox-container">
          <input 
            type="checkbox" 
            checked={preparationChecked}
            onChange={handleCheckboxChange}
          />
          <span className="checkmark"></span>
          <div className="preparation-text">
            <span className="emphasis">{preparation}</span>
            <span className="confirmation-text">
              {preparationChecked 
                ? '준비 완료되었습니다' 
                : '위 사항을 확인하신 후 체크해주세요'}
            </span>
          </div>
        </label>
      </div>
      
      {preparationChecked && (
        <div className="preparation-confirm">
          <div className="confirm-icon">✓</div>
          <p>준비사항 확인 완료</p>
        </div>
      )}
    </div>
  );
};

export default ExamPreparation;