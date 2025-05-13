import { createContext, useState, useContext, useEffect } from 'react';

// 인증 컨텍스트 생성
const AuthContext = createContext(null);

// AuthProvider 컴포넌트
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 불러오기
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
        // 오류 시 로컬 스토리지 데이터 삭제
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);
  
  // 로그인 함수
  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    // 로컬 스토리지에 사용자 정보 저장
    localStorage.setItem('user', JSON.stringify(userData));
  };
  
  // 로그아웃 함수
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // 로컬 스토리지에서 사용자 정보 삭제
    localStorage.removeItem('user');
  };
  
  // Context Provider를 통해 상태와 함수 제공
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 커스텀 훅을 통해 Auth 컨텍스트 사용 편의성 제공
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};