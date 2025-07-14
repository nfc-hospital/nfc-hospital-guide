import { createContext, useContext, useState, useEffect } from 'react';

// 인증 컨텍스트 생성
const AuthContext = createContext(null);

// 테스트용 임시 사용자 데이터
const MOCK_USER = {
  id: 'user123',
  name: '홍길동',
  phoneNumber: '1234',
  birthDate: '990101',
  loginType: 'simple' // 기본 로그인 타입
};

// AuthProvider 컴포넌트
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 로컬 스토리지에서 사용자 정보 불러오기
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (phoneNumber, birthDate) => {
    try {
      // 테스트를 위해 간단한 유효성 검사
      if (phoneNumber.length !== 4 || birthDate.length !== 6) {
        throw new Error('전화번호 뒷자리 4자리와 생년월일 6자리를 정확히 입력해주세요.');
      }

      // 테스트를 위해 항상 로그인 성공 처리
      const mockUser = {
        ...MOCK_USER,
        phoneNumber,
        birthDate,
        loginType: 'simple'
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      return true;
    } catch (error) {
      console.error('Simple login error:', error);
      throw new Error(error.message || '로그인에 실패했습니다.');
    }
  };

  const loginWithKakao = async () => {
    try {
      console.log('카카오 로그인 시도 (시뮬레이션)...');
      // 실제 카카오 SDK 연동 없이 시뮬레이션
      const mockUser = {
        ...MOCK_USER,
        id: 'kakao_user_123',
        name: '카카오 사용자',
        loginType: 'kakao'
      };

      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
      return true;
    } catch (error) {
      console.error('Kakao login error:', error);
      throw new Error('카카오 로그인에 실패했습니다.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // 로딩 중일 때 표시할 컴포넌트
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const value = {
    user,
    login,
    logout,
    loginWithKakao,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 커스텀 훅을 통해 Auth 컨텍스트 사용 편의성 제공
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}