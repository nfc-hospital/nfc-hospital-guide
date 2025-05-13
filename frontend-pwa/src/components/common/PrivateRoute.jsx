import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// 인증된 사용자만 접근 가능한 라우트를 위한 컴포넌트
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // 로딩 중일 때는 로딩 인디케이터 표시
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }
  
  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // 인증된 경우 자식 컴포넌트 렌더링
  return children;
};

export default PrivateRoute;