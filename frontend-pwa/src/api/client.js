import axios from 'axios';
import { getCSRFToken, debugCSRFToken } from '../utils/csrf';

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: '/api/v1',  // Vite 프록시가 처리
  timeout: 30000,  // 타임아웃을 30초로 증가
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키를 포함한 요청 허용
});

// 요청 인터셉터 - JWT 토큰 및 CSRF 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    // JWT 토큰 추가
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 JWT 토큰 헤더에 추가됨:', config.url);
    } else {
      console.log('⚠️ JWT 토큰이 없음:', config.url);
    }
    
    // CSRF 토큰 추가 (POST, PUT, PATCH, DELETE 요청에만)
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
        if (process.env.NODE_ENV === 'development') {
          console.log('🔒 CSRF token added to', config.method?.toUpperCase(), 'request:', config.url);
        }
      } else {
        // 개발 환경에서만 경고 표시
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ CSRF token not found for', config.method?.toUpperCase(), 'request to', config.url);
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    // 성공 응답 처리
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 에러 처리 (토큰 만료)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          // 토큰 갱신 시도
          const response = await axios.post('/api/v1/auth/token/refresh/', {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // 원래 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // 토큰 갱신 실패 - 로그아웃 처리
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }

    // 에러 메시지 표준화 - 안전한 처리
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    
    try {
      errorMessage = 
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        '알 수 없는 오류가 발생했습니다.';
    } catch (msgError) {
      console.warn('Error message parsing failed:', msgError);
    }

    return Promise.reject({
      status: error.response?.status,
      message: String(errorMessage), // 문자열로 강제 변환
      data: error.response?.data,
    });
  }
);

// API 메서드들
export const api = {
  // GET 요청
  get: (url, config) => apiClient.get(url, config),

  // POST 요청
  post: (url, data, config) => apiClient.post(url, data, config),

  // PUT 요청
  put: (url, data, config) => apiClient.put(url, data, config),

  // PATCH 요청
  patch: (url, data, config) => apiClient.patch(url, data, config),

  // DELETE 요청
  delete: (url, config) => apiClient.delete(url, config),
};

// 인증 관련 API
export const authAPI = {
  login: (credentials) => api.post('/auth/simple-login/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  logout: () => api.post('/auth/logout/'),
  refresh: (refreshToken) => api.post('/auth/token/refresh/', { refresh: refreshToken }),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
};

// NFC 관련 API
export const nfcAPI = {
  scan: (tagId) => api.post('/nfc/scan/', { tag_id: tagId }),
  getTags: () => api.get('/nfc/tags/'),
  getTagById: (id) => api.get(`/nfc/tags/${id}/`),
  createTag: (data) => api.post('/nfc/tags/', data),
  updateTag: (id, data) => api.patch(`/nfc/tags/${id}/`, data),
  deleteTag: (id) => api.delete(`/nfc/tags/${id}/`),
};

// 예약 관련 API
export const appointmentAPI = {
  getAppointments: () => api.get('/appointments/'),
  getTodaysAppointments: () => api.get('/appointments/today/'),
  getAppointmentById: (id) => api.get(`/appointments/${id}/`),
  createAppointment: (data) => api.post('/appointments/', data),
  updateAppointment: (id, data) => api.patch(`/appointments/${id}/`, data),
  cancelAppointment: (id) => api.post(`/appointments/${id}/cancel/`),
  getAvailableSlots: (date, departmentId) =>
    api.get('/appointments/available-slots/', { params: { date, department_id: departmentId } }),
};

// 대기열 관련 API
export const queueAPI = {
  getMyQueue: () => api.get('/queue/my-current/'),
  joinQueue: (departmentId) => api.post('/queue/join/', { department_id: departmentId }),
  leaveQueue: (queueId) => api.post(`/queue/${queueId}/leave/`),
  getQueueStatus: (departmentId) => api.get(`/queue/status/${departmentId}/`),
};

// 챗봇 API
export const chatbotAPI = {
  query: async (question, context = {}) => {
    // 오프라인 모드 처리
    if (!navigator.onLine) {
      const { searchOfflineFAQ, checkEmergencyKeywords, getEmergencyResponse } = await import('../utils/offlineData');
      
      if (checkEmergencyKeywords(question)) {
        return getEmergencyResponse();
      }
      
      return searchOfflineFAQ(question);
    }
    
    try {
      // 챗봇 서버는 별도 포트(5000)에서 실행되므로 직접 URL 사용
      const chatbotUrl = import.meta.env.DEV 
        ? 'http://localhost:5000/api/chatbot/query'
        : '/api/chatbot/query';
      
      const response = await axios.post(chatbotUrl, { question, context }, {
        headers: {
          'Content-Type': 'application/json',
        },
        // 챗봇 서버는 CSRF 토큰이 필요없음
        withCredentials: false,
        timeout: 10000 // 10초 타임아웃
      });
      
      return response.data;
    } catch (error) {
      console.warn('API 호출 실패, 오프라인 모드로 폴백:', error);
      
      // API 실패 시 오프라인 모드로 폴백
      const { searchOfflineFAQ, checkEmergencyKeywords, getEmergencyResponse } = await import('../utils/offlineData');
      
      if (checkEmergencyKeywords(question)) {
        return getEmergencyResponse();
      }
      
      return searchOfflineFAQ(question);
    }
  },
  
  getFaq: async () => {
    if (!navigator.onLine) {
      // 오프라인 FAQ 반환
      return {
        success: true,
        data: {
          items: [
            {
              id: "faq-offline-001",
              question: "CT 검사는 얼마나 걸리나요?",
              answer: "CT 검사는 15-30분 정도 소요됩니다.",
              category: "검사시간"
            },
            {
              id: "faq-offline-002",
              question: "MRI 검사 전 준비사항은?",
              answer: "모든 금속을 제거하시고, 4시간 금식하세요.",
              category: "검사준비"
            }
          ],
          totalCount: 2
        },
        message: "오프라인 FAQ",
        offline: true
      };
    }
    
    try {
      const chatbotUrl = import.meta.env.DEV 
        ? 'http://localhost:5000/api/chatbot/faq'
        : '/api/chatbot/faq';
      
      const response = await axios.get(chatbotUrl, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.warn('FAQ API 호출 실패, 오프라인 FAQ 사용');
      return this.getFaq(); // 재귀 호출로 오프라인 FAQ 반환
    }
  },
  
  getSuggestions: async () => {
    if (!navigator.onLine) {
      return {
        success: true,
        data: [
          "검사실 위치가 어디인가요?",
          "대기 시간은 얼마나 되나요?",
          "검사 준비사항을 알려주세요",
          "주차장은 어디에 있나요?",
          "병원 운영 시간이 어떻게 되나요?"
        ],
        offline: true
      };
    }
    
    try {
      const chatbotUrl = import.meta.env.DEV 
        ? 'http://localhost:5000/api/chatbot/suggestions'
        : '/api/chatbot/suggestions';
      
      const response = await axios.get(chatbotUrl, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.warn('추천 질문 API 호출 실패, 오프라인 모드 사용');
      return this.getSuggestions(); // 재귀 호출로 오프라인 데이터 반환
    }
  },
  
  // 의료 용어 설명 API
  explainMedicalTerm: async (term) => {
    if (!navigator.onLine) {
      return {
        term: term,
        message: `'${term}' 용어에 대한 오프라인 설명을 사용할 수 없습니다.`,
        suggestion: "의료진이나 간호사에게 직접 문의해주세요.",
        offline: true
      };
    }
    
    try {
      const chatbotUrl = import.meta.env.DEV 
        ? 'http://localhost:5000/api/chatbot/medical-terms'
        : '/api/chatbot/medical-terms';
      
      const response = await axios.post(chatbotUrl, { term }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: false,
        timeout: 5000
      });
      
      return response.data;
    } catch (error) {
      console.warn('의료 용어 API 호출 실패');
      return this.explainMedicalTerm(term); // 재귀 호출로 오프라인 응답 반환
    }
  }
};

// 관리자 대시보드 API
export const adminAPI = {
  // NFC 태그 관리
  nfc: {
    getAllTags: (params) => api.get('/dashboard/nfc/tags/', { params }),
    createTag: (data) => api.post('/dashboard/nfc/tags/', data),
    updateTag: (tagId, data) => api.put(`/dashboard/nfc/tags/${tagId}/`, data),
    deleteTag: (tagId) => api.delete(`/dashboard/nfc/tags/${tagId}/`),
    bulkOperation: (data) => api.post('/dashboard/nfc/tags/bulk/', data),
    getTagStatistics: (params) => api.get('/dashboard/nfc/tags/statistics/', { params }),
    getTagStatus: () => api.get('/dashboard/tags/status/'),
    getTagHistory: (tagId) => api.get(`/dashboard/nfc/tags/${tagId}/history/`),
    createTagExamMapping: (data) => api.post('/dashboard/nfc/tag-exam-mapping/', data),
    deleteTagExamMapping: (mappingId) => api.delete(`/dashboard/tags/mapping/${mappingId}`),
    // 오늘 스캔 통계 API 추가
    getTodayScans: () => api.get('/queue/nfc/today-scans/'),
  },

  // 대기열 모니터링
  queue: {
    getRealTimeData: () => api.get('/queue/dashboard/realtime-data/'),
    getByDepartment: (params) => api.get('/queue/dashboard/by-department/', { params }),
    updateAlertSettings: (data) => api.put('/queue/dashboard/alert-settings/', data),
    getMetrics: (params) => api.get('/queue/dashboard/metrics/', { params }),
    callPatient: (data) => api.post('/queue/medical/call-patient/', data),
    getMissingPatients: () => api.get('/queue/medical/missing-patients/'),
  },

  // 통계 및 분석
  analytics: {
    getPatientFlow: (params) => api.get('/analytics/patient-flow/', { params }),
    getWaitingTimeStats: (params) => api.get('/analytics/waiting-time/', { params }),
    getCongestionHeatmap: (params) => api.get('/analytics/congestion-heatmap/', { params }),
    getNFCUsage: (params) => api.get('/analytics/nfc-usage/', { params }),
    getBottlenecks: () => api.get('/analytics/bottlenecks/'),
    generateCustomReport: (data) => api.post('/analytics/custom-report/', data),
    exportData: (params) => api.get('/analytics/export/', { params, responseType: 'blob' }),
  },                                                                                                   
};

// WebSocket 연결 관리
export class WebSocketClient {
  constructor() {
    this.connections = new Map();
  }

  connect(endpoint, onMessage, onError = null, onOpen = null, onClose = null) {
    // 개발/프로덕션 환경에 따른 WebSocket URL 설정
    const isDev = import.meta.env.DEV;
    const wsHost = isDev ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `ws://${wsHost}/ws${endpoint}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`WebSocket connected: ${endpoint}`);
      if (onOpen) onOpen();
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error(`WebSocket error on ${endpoint}:`, error);
      if (onError) onError(error);
    };
    
    ws.onclose = () => {
      console.log(`WebSocket disconnected: ${endpoint}`);
      this.connections.delete(endpoint);
      if (onClose) onClose();
    };
    
    this.connections.set(endpoint, ws);
    return ws;
  }

  disconnect(endpoint) {
    const ws = this.connections.get(endpoint);
    if (ws) {
      ws.close();
      this.connections.delete(endpoint);
    }
  }

  disconnectAll() {
    this.connections.forEach((ws) => ws.close());
    this.connections.clear();
  }

  send(endpoint, message) {
    const ws = this.connections.get(endpoint);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

export const wsClient = new WebSocketClient();

// CSRF 토큰 초기화 함수 (앱 시작 시 호출)
export const initializeCSRFToken = async () => {
  try {
    // Django의 CSRF 토큰을 가져오기 위한 GET 요청
    const response = await fetch('/api/v1/auth/csrf-token/', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ CSRF token initialized successfully:', data.success);
      
      // 개발 환경에서 CSRF 토큰 상태 디버깅
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => debugCSRFToken(), 100);
      }
    } else {
      console.warn('❌ CSRF token request failed:', response.status);
    }
  } catch (error) {
    console.warn('❌ Failed to initialize CSRF token:', error.message);
    // 실패해도 앱 동작은 계속 진행
  }
};

// CSRF 토큰 유틸리티 함수들 내보내기
export { getCSRFToken };

export default apiClient;