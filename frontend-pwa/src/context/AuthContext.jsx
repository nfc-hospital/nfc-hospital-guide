// frontend-pwa/src/context/AuthContext.jsx - 완전 수정 버전
import { createContext, useContext, useState, useEffect } from 'react';
import { getCSRFToken, debugCSRFToken } from '../utils/csrf';
import { authAPI } from '../api/client';
import useJourneyStore from '../store/journeyStore';

// 인증 컨텍스트 생성
const AuthContext = createContext(null);

// AuthProvider 컴포넌트
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 로컬 스토리지에서 사용자 정보 및 토큰 불러오기
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('access_token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // 간편 로그인 (실제 API 호출)
  const login = async (phoneNumber, birthDate) => {
    try {
      console.log('🔐 실제 간편 로그인 API 호출...');
      
      // 먼저 CSRF 토큰 확인
      let csrfToken = getCSRFToken();
      if (!csrfToken) {
        console.log('🔄 CSRF 토큰 없음, 새로 가져오는 중...');
        try {
          await fetch('/api/v1/auth/csrf-token/', {
            method: 'GET',
            credentials: 'include'
          });
          csrfToken = getCSRFToken();
          console.log('✅ CSRF 토큰 획득:', csrfToken ? '성공' : '실패');
        } catch (error) {
          console.warn('⚠️ CSRF 토큰 가져오기 실패:', error);
        }
      }
      
      if (phoneNumber.length !== 4 || birthDate.length !== 6) {
        throw new Error('전화번호 뒷자리 4자리와 생년월일 6자리를 정확히 입력해주세요.');
      }

      // 🔧 YYMMDD → YYYY-MM-DD 변환
      const convertBirthDate = (yymmdd) => {
        const yy = yymmdd.substring(0, 2);
        const mm = yymmdd.substring(2, 4);
        const dd = yymmdd.substring(4, 6);
        
        // YY를 YYYY로 변환 (예: 99 → 1999, 01 → 2001)
        // 50 이상이면 19XX, 50 미만이면 20XX로 가정
        const yyyy = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`;
        
        return `${yyyy}-${mm}-${dd}`;
      };

      const formattedBirthDate = convertBirthDate(birthDate);
      console.log(`📅 날짜 변환: ${birthDate} → ${formattedBirthDate}`);

      const requestData = {
        phoneLast4: phoneNumber,
        birthDate: formattedBirthDate
      };

      console.log('🚀 API 요청 데이터:', requestData);

      // axios 인터셉터를 통해 CSRF 토큰이 자동으로 추가됨
      const data = await authAPI.login(requestData);
      console.log('✅ 로그인 API 응답:', data);

      // 🔧 올바른 응답 구조에서 토큰 추출
      if (data.success && data.data && data.data.tokens) {
        const accessToken = data.data.tokens.access;
        const refreshToken = data.data.tokens.refresh;
        const userData = data.data.user;
        
        console.log('✅ 토큰 추출 성공');
        console.log('- Access Token:', accessToken.substring(0, 20) + '...');
        console.log('- User Data:', userData);
        
        // 토큰과 사용자 정보 저장
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        console.log('✅ JWT 토큰 및 사용자 정보 저장 완료');
        
        // 로그인 성공 후 환자 여정 데이터 가져오기
        try {
          console.log('🔄 환자 여정 데이터 가져오는 중...');
          await useJourneyStore.getState().fetchJourneyData();
          console.log('✅ 환자 여정 데이터 로드 완료');
        } catch (error) {
          console.error('⚠️ 환자 여정 데이터 로드 실패:', error);
          // 여정 데이터 로드 실패해도 로그인은 성공으로 처리
        }
        
        return true;
      } else {
        console.log('❌ 예상하지 못한 응답 구조:', data);
        throw new Error('서버 응답에서 토큰을 찾을 수 없습니다.');
      }
      
    } catch (error) {
      console.error('❌ 간편 로그인 오류:', error);
      throw new Error(error.message || '로그인에 실패했습니다.');
    }
  };

  // 카카오 로그인 (실제 API 호출)
  const loginWithKakao = async (kakaoAuthCode) => {
    try {
      console.log('🔐 실제 카카오 로그인 API 호출...');

      const response = await fetch('/api/v1/auth/kakao/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: kakaoAuthCode
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '카카오 로그인에 실패했습니다.');
      }

      const data = await response.json();
      console.log('✅ 카카오 로그인 API 응답:', data);

      // 카카오 로그인도 동일한 구조 처리
      if (data.success && data.data && data.data.tokens) {
        const accessToken = data.data.tokens.access;
        const refreshToken = data.data.tokens.refresh;
        const userData = data.data.user;
        
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        console.log('✅ JWT 토큰 및 사용자 정보 저장 완료');
        
        // 로그인 성공 후 환자 여정 데이터 가져오기
        try {
          console.log('🔄 환자 여정 데이터 가져오는 중...');
          await useJourneyStore.getState().fetchJourneyData();
          console.log('✅ 환자 여정 데이터 로드 완료');
        } catch (error) {
          console.error('⚠️ 환자 여정 데이터 로드 실패:', error);
          // 여정 데이터 로드 실패해도 로그인은 성공으로 처리
        }
        
        return true;
      } else {
        throw new Error('서버 응답에서 토큰을 찾을 수 없습니다.');
      }

    } catch (error) {
      console.error('❌ 카카오 로그인 오류:', error);
      throw new Error(error.message || '카카오 로그인에 실패했습니다.');
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // 백엔드에 로그아웃 요청
        await fetch('/api/v1/auth/logout/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
      }
    } catch (error) {
      console.error('로그아웃 API 오류:', error);
    } finally {
      // 로컬 데이터 정리
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // journeyStore 데이터 초기화
      useJourneyStore.getState().clearJourneyData();
      
      console.log('✅ 로그아웃 및 토큰 정리 완료');
    }
  };

  // 토큰 갱신
  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        throw new Error('Refresh token이 없습니다.');
      }

      const response = await fetch('/api/v1/auth/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refresh
        })
      });

      if (!response.ok) {
        throw new Error('토큰 갱신에 실패했습니다.');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      console.log('✅ 토큰 갱신 완료');
      return data.access;

    } catch (error) {
      console.error('❌ 토큰 갱신 오류:', error);
      logout(); // 갱신 실패 시 로그아웃
      return null;
    }
  };

  // 로딩 중일 때 표시할 컴포넌트
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const value = {
    user,
    login,
    logout,
    loginWithKakao,
    refreshToken,
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