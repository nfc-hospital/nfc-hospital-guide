import React, { useState } from 'react';
import '../styles/WaitingInfo.css';

const WaitingInfo = ({ position, etaMin }) => {
  // 대기 상태에 따른 클래스 결정
  const getStatusClass = () => {
    if (position === 0) return 'status-none';
    if (position <= 2) return 'status-low';
    if (position <= 5) return 'status-medium';
    return 'status-high';
  };
  
  // 대기 상태에 따른 텍스트 결정
  const getStatusText = () => {
    if (position === 0) return '대기 없음';
    if (position <= 2) return '대기 적음';
    if (position <= 5) return '대기 보통';
    return '대기 많음';
  };
  
  return (
    <div className="section-container waiting-info-container">
      <h3>현재 대기 상황</h3>
      
      <div className={`waiting-status ${getStatusClass()}`}>
        <div className="waiting-count">
          <span className="count-number">{position}</span>
          <span className="count-label">명</span>
        </div>
        
        <div className="waiting-time">
          <span className="time-number">{etaMin}</span>
          <span className="time-label">분 예상</span>
        </div>
        
        <div className="waiting-text">
          {getStatusText()}
        </div>
      </div>
      
      <div className="last-updated">
        마지막 업데이트: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default WaitingInfo;