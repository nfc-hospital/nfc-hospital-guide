import { useState, useEffect } from 'react';
import { getCSRFToken, isCSRFTokenValid } from '../../utils/csrf';

const CSRFStatus = () => {
  const [csrfToken, setCsrfToken] = useState('');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const token = getCSRFToken();
      setCsrfToken(token || '없음');
      setIsValid(isCSRFTokenValid());
    };

    updateStatus();
    
    // 1초마다 상태 업데이트
    const interval = setInterval(updateStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '10px',
      backgroundColor: 'white',
      border: '2px solid #17a2b8',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9998,
      maxWidth: '300px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        color: '#17a2b8',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center'
      }}>
        🔒 CSRF Status
        <span style={{
          marginLeft: '8px',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          backgroundColor: isValid ? '#d4edda' : '#f8d7da',
          color: isValid ? '#155724' : '#721c24'
        }}>
          {isValid ? 'VALID' : 'INVALID'}
        </span>
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <strong>Token:</strong>
      </div>
      <div style={{ 
        backgroundColor: '#f8f9fa',
        padding: '4px',
        borderRadius: '4px',
        wordBreak: 'break-all',
        fontSize: '10px',
        color: isValid ? '#495057' : '#dc3545'
      }}>
        {csrfToken.length > 20 ? `${csrfToken.substring(0, 20)}...` : csrfToken}
      </div>
      
      <div style={{ 
        marginTop: '8px',
        fontSize: '10px',
        color: '#6c757d'
      }}>
        Last checked: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default CSRFStatus;