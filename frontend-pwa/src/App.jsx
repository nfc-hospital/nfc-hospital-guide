import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { initializeCSRFToken } from './api/client';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import KakaoOAuth from './components/auth/KakaoOAuth';
import Exam from './pages/Exam';
import NotFound from './pages/NotFound';
import PublicGuide from './components/PublicGuide';
import PrivateRoute from './components/common/PrivateRoute';
import WebSocketTest from './components/WebSocketTest';
import CSRFStatus from './components/dev/CSRFStatus';
// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import NFCTagManagement from './pages/admin/NFCTagManagement';
import QueueMonitoring from './pages/admin/QueueMonitoring';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import ChatbotTest from './pages/ChatbotTest';
// New Chatbot System
import ChatbotSystem from './components/chatbot-v2';
import './styles/global.css';

function App() {
  const [elderlyMode, setElderlyMode] = useState(false);

  // 앱 시작 시 CSRF 토큰 초기화
  useEffect(() => {
    initializeCSRFToken();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/oauth/kakao" element={<KakaoOAuth />} />
          <Route path="/public-guide" element={<PublicGuide />} />
          <Route path="/chatbot-test" element={<ChatbotTest />} />
          <Route element={<Layout />}>
            <Route path="/" element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            } />
            <Route path="/exam/:examId" element={
              <PrivateRoute>
                <Exam />
              </PrivateRoute>
            } />
            
            {/* Admin Dashboard routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            } />
            <Route path="/dashboard/nfc-tags" element={
              <PrivateRoute>
                <NFCTagManagement />
              </PrivateRoute>
            } />
            <Route path="/dashboard/queue" element={
              <PrivateRoute>
                <QueueMonitoring />
              </PrivateRoute>
            } />
            <Route path="/dashboard/analytics" element={
              <PrivateRoute>
                <AnalyticsDashboard />
              </PrivateRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        
        {/* 개발용 컴포넌트들 */}
        {process.env.NODE_ENV === 'development' && (
          <>
            {/* CSRF 상태 모니터 */}
            <CSRFStatus />
            
            {/* WebSocket 테스트 컴포넌트 */}
            <div style={{ 
              position: 'fixed', 
              top: '10px', 
              right: '10px', 
              zIndex: 9999,
              backgroundColor: 'white',
              border: '2px solid #007bff',
              borderRadius: '8px',
              padding: '8px'
            }}>
              <details>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  color: '#007bff',
                  padding: '4px'
                }}>
                  🧪 WebSocket 테스트
                </summary>
                <div style={{ marginTop: '10px' }}>
                  <WebSocketTest />
                </div>
              </details>
            </div>
          </>
        )}
        
        {/* 새로운 챗봇 시스템 */}
        <ChatbotSystem elderlyMode={elderlyMode} />
      </Router>
    </AuthProvider>
  );
}

export default App;