import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeCSRFToken } from './api/client';
import useJourneyStore from './store/journeyStore';
import useMapStore from './store/mapStore';
import { initializeDefaultRoutes } from './data/defaultRoutes';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import Layout from './components/common/Layout';
import PageTransition from './components/common/PageTransition';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import PublicHome from './pages/PublicHome';
import Login from './pages/Login';
import KakaoOAuth from './components/auth/KakaoOAuth';
import Exam from './pages/Exam';
import MyExams from './pages/MyExams';
import NotFound from './pages/NotFound';
// PublicGuide 제거 - PublicHome에 통합됨
import PrivateRoute from './components/common/PrivateRoute';
import WebSocketTest from './components/WebSocketTest';
import CSRFStatus from './components/dev/CSRFStatus';
// Admin pages - AdminHomeScreen으로 통합
import AdminHomeScreen from './components/screens/AdminHomeScreen';
import TestDataManager from './pages/admin/TestDataManager';
import MapManager from './pages/admin/MapManager';
import ChatbotTest from './pages/ChatbotTest';
import MapTest from './pages/MapTest';
import MapEditor from './pages/MapEditor';
// New Chatbot System
import ChatbotSystem from './components/chatbot-v2';
// Mock NFC Panel for development
import MockNFCPanel from './components/MockNFCPanel';
import './styles/global.css';

// 메인 앱 컴포넌트
function AppContent() {
  const [elderlyMode, setElderlyMode] = useState(false);
  const { isAuthenticated } = useAuth();
  const { isLoading, fetchJourneyData, user } = useJourneyStore();
  const { updateRouteBasedOnLocation } = useMapStore();

  // 앱 시작 시 토큰 확인 및 데이터 로딩
  useEffect(() => {
    // 기본 경로 데이터 초기화 (최초 1회만)
    const isInitialized = initializeDefaultRoutes();
    if (isInitialized) {
      console.log('✅ 기본 경로 데이터가 초기화되었습니다.');
    }
    
    const loadUserData = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        console.log('🔄 기존 로그인 세션 감지, 환자 데이터 로딩...');
        try {
          await fetchJourneyData();
          console.log('✅ 환자 데이터 로드 완료');
          
          // 초기 경로 설정 (NFC 태깅 없이도 기본 위치에서 목적지까지 경로 표시)
          updateRouteBasedOnLocation(null); // null이면 기본 위치(정문 로비) 사용
          console.log('🗺️ 초기 경로 설정 완료');
        } catch (error) {
          console.error('❌ 환자 데이터 로드 실패:', error);
          // 401 에러인 경우에만 토큰 제거
          if (error.status === 401) {
            console.log('❌ 인증 만료, 토큰 제거');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      }
    };
    
    loadUserData();
  }, []); // 의존성 배열을 빈 배열로 변경하여 최초 1회만 실행

  // 전역 로딩 상태 표시
  if (isLoading) {
    return <LoadingSpinner fullScreen={true} message="정보를 불러오고 있습니다..." />;
  }

  return (
    <>
      {/* 전역 토스트 알림 */}
      <Toaster 
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                fontSize: '16px',
                padding: '16px',
                borderRadius: '12px',
              },
              success: {
                style: {
                  background: '#10b981',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#10b981',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#ef4444',
                },
              },
            }}
          />
          
          <Routes>
          {/* 비로그인 사용자를 위한 홈 화면 - Layout 밖에 배치 */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/oauth/kakao" element={<KakaoOAuth />} />
          {/* public-guide 제거 - PublicHome에 통합됨 */}
          <Route path="/chatbot-test" element={<ChatbotTest />} />
          <Route path="/map-test" element={<MapTest />} />
          <Route path="/map-editor" element={<MapEditor />} />
          {/* Public NFC route - no authentication required */}
          <Route path="/nfc/:tagId" element={<Home />} />
          
          <Route element={<Layout />}>
            {/* 로그인 사용자를 위한 홈 화면 */}
            <Route path="/home" element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            } />
            <Route path="/exam/:examId" element={
              <PrivateRoute>
                <Exam />
              </PrivateRoute>
            } />
            <Route path="/my-exams" element={
              <PrivateRoute>
                <MyExams />
              </PrivateRoute>
            } />
            
            {/* Admin Dashboard - 통합된 AdminHomeScreen 사용 */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <AdminHomeScreen />
              </PrivateRoute>
            } />
            <Route path="/dashboard/*" element={
              <PrivateRoute>
                <AdminHomeScreen />
              </PrivateRoute>
            } />
            <Route path="/test" element={
              <PrivateRoute>
                <TestDataManager />
              </PrivateRoute>
            } />
            <Route path="/admin/test-data" element={
              <PrivateRoute>
                <TestDataManager />
              </PrivateRoute>
            } />
            <Route path="/admin/map-manager" element={
              <PrivateRoute>
                <MapManager />
              </PrivateRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        
        {/* Mock NFC Panel - 개발 환경에서만 표시 */}
        {process.env.NODE_ENV === 'development' && <MockNFCPanel />}
        
        {/* 개발용 컴포넌트들 - [테스트 버튼] */}
        {/* {process.env.NODE_ENV === 'development' && (
          <>
            {/* CSRF 상태 모니터 - [테스트 버튼] */}
            {/* <CSRFStatus /> */}
            
            {/* WebSocket 테스트 컴포넌트 - [테스트 버튼] */}
            {/* <div style={{ 
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
        )} */}
        
      {/* 새로운 챗봇 시스템 */}
      <ChatbotSystem elderlyMode={elderlyMode} />
    </>
  );
}

// App 래퍼 컴포넌트
function App() {
  // 앱 시작 시 CSRF 토큰 초기화
  useEffect(() => {
    initializeCSRFToken();
  }, []);

  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;