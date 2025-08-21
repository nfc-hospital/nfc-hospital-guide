import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// 인증된 사용자만 접근 가능한 라우트를 위한 컴포넌트
export default function PrivateRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  
  // 인증되지 않은 경우 홈페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // 인증된 경우 자식 컴포넌트 렌더링
  return children;
}