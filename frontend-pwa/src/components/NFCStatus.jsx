import React from 'react';
import '../styles/NFCStatus.css';

const NFCStatus = () => {
  // 실제 구현에서는 NFC 지원 여부 및 상태 확인
  const nfcSupported = 'NDEFReader' in window;
  
  return (
    <div className="nfc-status">
      <div className={`status-indicator ${nfcSupported ? 'available' : 'unavailable'}`}>
        {nfcSupported ? 'NFC 지원' : 'NFC 미지원'}
      </div>
    </div>
  );
};

export default NFCStatus;