const axios = require('axios');

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: process.env.DJANGO_API_URL || 'http://localhost:8000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// 토큰 저장 및 관리 유틸리티
const TokenManager = {
  // 토큰 저장
  setTokens: (accessToken, refreshToken) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    }
  },

  // 액세스 토큰 가져오기
  getAccessToken: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  // 리프레시 토큰 가져오기
  getRefreshToken: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('refresh_token');
    }
    return null;
  },

  // 토큰 제거
  clearTokens: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  // 토큰 유효성 검증
  isValidToken: (token) => {
    if (!token || token.trim() === '' || token === 'null' || token === 'undefined') {
      return false;
    }
    
    try {
      // JWT 토큰은 3부분으로 구성 (header.payload.signature)
      const tokenParts = token.split('.');
      return tokenParts.length === 3;
    } catch (error) {
      console.error('토큰 검증 중 오류:', error);
      return false;
    }
  }
};

// 요청 인터셉터 - JWT 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    
    if (token && TokenManager.isValidToken(token)) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 JWT 토큰이 요청에 추가됨:', config.url);
    } else if (token) {
      // 잘못된 토큰이면 제거
      console.warn('⚠️ 잘못된 토큰 형식 감지, 토큰을 제거합니다');
      TokenManager.clearTokens();
    }
    
    return config;
  },
  (error) => {
    console.error('❌ 요청 인터셉터 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리 및 토큰 갱신
apiClient.interceptors.response.use(
  (response) => {
    // 성공 응답 처리
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized 에러 처리
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log('🔄 401 오류 감지, 토큰 갱신 시도 중...');

      try {
        const refreshToken = TokenManager.getRefreshToken();
        
        if (refreshToken && TokenManager.isValidToken(refreshToken)) {
          // 토큰 갱신 요청
          const response = await axios.post(
            `${process.env.DJANGO_API_URL || 'http://localhost:8000/api/v1'}/auth/token/refresh/`,
            { refresh: refreshToken },
            {
              headers: { 'Content-Type': 'application/json' },
              withCredentials: true,
            }
          );

          const { access } = response.data;
          
          if (access) {
            // 새 토큰 저장
            TokenManager.setTokens(access, refreshToken);
            
            // 원래 요청에 새 토큰 적용 후 재시도
            originalRequest.headers.Authorization = `Bearer ${access}`;
            console.log('✅ 토큰 갱신 성공, 원래 요청을 재시도합니다');
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('❌ 토큰 갱신 실패:', refreshError.message);
        
        // 토큰 갱신 실패 - 로그아웃 처리
        TokenManager.clearTokens();
        
        // 브라우저 환경에서만 리디렉션
        if (typeof window !== 'undefined') {
          console.log('🚪 로그인 페이지로 리디렉션합니다');
          window.location.href = '/login';
        }
        
        return Promise.reject({
          status: 401,
          message: '인증이 만료되었습니다. 다시 로그인해주세요.',
          data: refreshError.response?.data,
        });
      }
    }

    // 기타 에러 처리
    const errorMessage = 
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      '알 수 없는 오류가 발생했습니다.';

    console.error('❌ API 오류:', {
      status: error.response?.status,
      message: errorMessage,
      url: error.config?.url,
    });

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
    });
  }
);

// 로그인 API
const authAPI = {
  // 로그인
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/simple-login/', credentials);
      
      if (response.tokens) {
        // 토큰 저장
        TokenManager.setTokens(response.tokens.access, response.tokens.refresh);
        console.log('✅ 로그인 성공, 토큰이 저장되었습니다');
      }
      
      return response;
    } catch (error) {
      console.error('❌ 로그인 실패:', error.message);
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      await apiClient.post('/auth/logout/');
    } catch (error) {
      console.warn('⚠️ 로그아웃 API 호출 실패:', error.message);
    } finally {
      // 토큰 제거
      TokenManager.clearTokens();
      console.log('✅ 로그아웃 완료, 토큰이 제거되었습니다');
    }
  },

  // 프로필 조회
  getProfile: () => apiClient.get('/auth/profile/'),

  // 토큰 검증
  verifyToken: async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('토큰이 없습니다');
      }

      await apiClient.post('/auth/token/verify/', { token });
      return true;
    } catch (error) {
      console.warn('⚠️ 토큰 검증 실패:', error.message);
      return false;
    }
  },
};

// 보호된 API 호출을 위한 wrapper
const protectedAPI = {
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  patch: (url, data, config) => apiClient.patch(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
};

// 인증 상태 확인
const checkAuthStatus = () => {
  const token = TokenManager.getAccessToken();
  const isValid = TokenManager.isValidToken(token);
  
  console.log('🔍 현재 인증 상태:', {
    hasToken: !!token,
    isValidFormat: isValid,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
  });
  
  return isValid;
};

module.exports = {
  apiClient,
  TokenManager,
  authAPI,
  protectedAPI,
  checkAuthStatus,
};