import axios from 'axios';
import { getCSRFToken, debugCSRFToken } from '../utils/csrf';

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: '/api/v1',  // Vite 프록시가 처리
  timeout: 10000,
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

    // 에러 메시지 표준화
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      '알 수 없는 오류가 발생했습니다.';

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
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
  getAppointmentById: (id) => api.get(`/appointments/${id}/`),
  createAppointment: (data) => api.post('/appointments/', data),
  updateAppointment: (id, data) => api.patch(`/appointments/${id}/`, data),
  cancelAppointment: (id) => api.post(`/appointments/${id}/cancel/`),
  getAvailableSlots: (date, departmentId) =>
    api.get('/appointments/available-slots/', { params: { date, department_id: departmentId } }),
};

// 대기열 관련 API
export const queueAPI = {
  getMyQueue: () => api.get('/queue/my-queue/'),
  joinQueue: (departmentId) => api.post('/queue/join/', { department_id: departmentId }),
  leaveQueue: (queueId) => api.post(`/queue/${queueId}/leave/`),
  getQueueStatus: (departmentId) => api.get(`/queue/status/${departmentId}/`),
};

// 관리자 대시보드 API
export const adminAPI = {
  // NFC 태그 관리
  nfc: {
    getAllTags: (params) => api.get('/admin/nfc/tags/list/', { params }),
    createTag: (data) => api.post('/admin/nfc/tags/', data),
    updateTag: (tagId, data) => api.put(`/admin/nfc/tags/${tagId}/`, data),
    deleteTag: (tagId) => api.delete(`/admin/nfc/tags/${tagId}/`),
    bulkOperation: (data) => api.post('/admin/nfc/tags/bulk/', data),
    getTagStatistics: (params) => api.get('/admin/nfc/tags/statistics/', { params }),
    getTagStatus: () => api.get('/admin/tags/status/'),
    getTagHistory: (tagId) => api.get(`/admin/nfc/tags/${tagId}/history/`),
    createTagExamMapping: (data) => api.post('/admin/nfc/tag-exam-mapping/', data),
    deleteTagExamMapping: (mappingId) => api.delete(`/tags/mapping/${mappingId}`),
  },

  // 대기열 모니터링
  queue: {
    getRealTimeData: () => api.get('/queue/admin/realtime/'),
    getByDepartment: (params) => api.get('/queue/admin/by-department/', { params }),
    updateAlertSettings: (data) => api.put('/queue/admin/alert-settings/', data),
    getMetrics: (params) => api.get('/queue/admin/metrics/', { params }),
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

  connect(endpoint, onMessage, onError = null) {
    const wsUrl = `ws://${window.location.host}/ws${endpoint}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`WebSocket connected: ${endpoint}`);
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