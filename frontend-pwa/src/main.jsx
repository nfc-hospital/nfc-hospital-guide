import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // React.StrictMode 임시 비활성화 - 개발 중 이중 호출로 인한 무한 루프 방지
  // TODO: 프로덕션 배포 전 다시 활성화 검토
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);