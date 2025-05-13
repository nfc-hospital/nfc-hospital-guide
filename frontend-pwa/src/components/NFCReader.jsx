import { useState, useEffect } from 'react';
import '../styles/NFCReader.css';

const NFCReader = () => {
  const [nfcStatus, setNfcStatus] = useState('idle'); // idle, scanning, success, error
  const [lastScanned, setLastScanned] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    // 컴포넌트 마운트 시 NFC 스캔 시작
    startNFCScan();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      // 필요한 경우 NFC 스캔 중지 로직 추가
    };
  }, []);
  
  const startNFCScan = async () => {
    if (!('NDEFReader' in window)) {
      console.error('NFC is not supported in this browser');
      return;
    }
    
    try {
      const ndef = new window.NDEFReader();
      setNfcStatus('scanning');
      
      await ndef.scan();
      console.log('NFC scan started successfully');
      
      ndef.addEventListener('reading', ({ message, serialNumber }) => {
        console.log('NFC tag read!');
        
        // NFC 메시지 처리
        if (message && message.records) {
          handleNFCMessage(message.records, serialNumber);
        }
      });
      
      ndef.addEventListener('readingerror', () => {
        console.error('NFC reading error');
        setNfcStatus('error');
        setErrorMessage('태그 읽기 오류가 발생했습니다. 다시 시도해주세요.');
        
        // 3초 후 다시 스캔 상태로 변경
        setTimeout(() => {
          setNfcStatus('scanning');
          setErrorMessage('');
        }, 3000);
      });
    } catch (error) {
      console.error('NFC scan error:', error);
      setNfcStatus('error');
      
      if (error.name === 'NotAllowedError') {
        setErrorMessage('NFC 권한이 거부되었습니다. 브라우저 설정을 확인해주세요.');
      } else if (error.name === 'NotSupportedError') {
        setErrorMessage('이 기기에서는 NFC를 사용할 수 없습니다.');
      } else {
        setErrorMessage('NFC 스캔 중 오류가 발생했습니다.');
      }
    }
  };
  
  const handleNFCMessage = (records, serialNumber) => {
    try {
      // 첫 번째 레코드의 데이터를 텍스트로 변환
      const record = records[0];
      
      if (record && record.recordType === 'text') {
        const textDecoder = new TextDecoder();
        const text = textDecoder.decode(record.data);
        
        // 태그 ID와 내용 저장
        const tagData = {
          id: serialNumber,
          content: text,
          timestamp: new Date().toISOString()
        };
        
        setLastScanned(tagData);
        setNfcStatus('success');
        
        // 태그 내용 처리 (URL이거나 ID일 수 있음)
        processTagContent(text);
        
        // 스캔 성공 후 3초 뒤 다시 스캔 모드로 전환
        setTimeout(() => {
          setNfcStatus('scanning');
        }, 3000);
      } else {
        throw new Error('Unsupported record type');
      }
    } catch (error) {
      console.error('Error processing NFC message:', error);
      setNfcStatus('error');
      setErrorMessage('NFC 태그 정보를 처리할 수 없습니다.');
      
      setTimeout(() => {
        setNfcStatus('scanning');
        setErrorMessage('');
      }, 3000);
    }
  };
  
  const processTagContent = (content) => {
    // URL 형식 확인
    if (content.startsWith('http')) {
      // 태그가 URL이면 페이지 이동
      window.location.href = content;
    } else if (content.startsWith('exam:')) {
      // exam:1 형식이면 검사 ID 추출하여 페이지 이동
      const examId = content.split(':')[1];
      window.location.href = `/exam/${examId}`;
    } else {
      // 기타 형식은 서버에 요청하여 처리
      console.log('Tag content to be processed on server:', content);
      // 서버 처리 로직 추가 예정
    }
  };
  
  const renderStatusIndicator = () => {
    switch (nfcStatus) {
      case 'scanning':
        return (
          <div className="nfc-indicator scanning">
            <div className="scan-animation"></div>
            <p>NFC 태그를 스캔해주세요</p>
          </div>
        );
      
      case 'success':
        return (
          <div className="nfc-indicator success">
            <div className="success-icon">✓</div>
            <p>태그 스캔 성공!</p>
            {lastScanned && <p className="tag-info">태그 ID: {lastScanned.id.substring(0, 8)}...</p>}
          </div>
        );
      
      case 'error':
        return (
          <div className="nfc-indicator error">
            <div className="error-icon">!</div>
            <p>{errorMessage}</p>
            <button onClick={startNFCScan} className="retry-button">
              다시 시도
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="nfc-reader-container">
      {renderStatusIndicator()}
    </div>
  );
};

export default NFCReader;