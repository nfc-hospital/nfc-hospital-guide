import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import KakaoOAuth from './components/auth/KakaoOAuth';
import Exam from './pages/Exam';
import NotFound from './pages/NotFound';
import PublicGuide from './components/PublicGuide';
import PrivateRoute from './components/common/PrivateRoute';
import WebSocketTest from './components/WebSocketTest'; 
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/oauth/kakao" element={<KakaoOAuth />} />
          <Route path="/public-guide" element={<PublicGuide />} />
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
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        
        {/* WebSocket 테스트 컴포넌트 */}
        {process.env.NODE_ENV === 'development' && (
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
        )}
      </Router>
    </AuthProvider>
  );
}

export default App;