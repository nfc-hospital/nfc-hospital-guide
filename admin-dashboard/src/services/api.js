import axios from 'axios';

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1', // Django 서버 주소
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키를 포함한 요청 허용
});

// CSRF 토큰 가져오기
function getCSRFToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// 요청 인터셉터 - JWT 토큰 및 CSRF 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    // JWT 토큰 추가
    const token = localStorage.getItem('admin_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CSRF 토큰 추가 (POST, PUT, PATCH, DELETE 요청에만)
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
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
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 에러 처리 (토큰 만료)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('admin_refresh_token');
        if (refreshToken) {
          // 토큰 갱신 시도
          const response = await axios.post('http://localhost:8000/api/v1/auth/token/refresh/', {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('admin_access_token', access);

          // 원래 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // 토큰 갱신 실패 - 로그아웃 처리
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
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
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  patch: (url, data, config) => apiClient.patch(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
};

// 관리자 인증 API
export const authAPI = {
  login: (credentials) => api.post('/admin/login/', credentials),
  logout: () => api.post('/admin/logout/'),
  getProfile: () => api.get('/admin/profile/'),
  updateProfile: (data) => api.patch('/admin/profile/', data),
};

// 관리자 대시보드 API
export const adminAPI = {
  // NFC 태그 관리
  nfc: {
    getAllTags: (params) => api.get('/admin/tags/', { params }),
    createTag: (data) => api.post('/admin/tags/', data),
    updateTag: (tagId, data) => api.patch(`/admin/tags/${tagId}/`, data),
    deleteTag: (tagId) => api.delete(`/admin/tags/${tagId}/`),
    bulkOperation: (data) => api.post('/admin/tags/bulk/', data),
    getTagStatistics: (params) => api.get('/admin/tags/status/', { params }),
  },

  // 검사 관리
  exams: {
    getAllExams: (params) => api.get('/admin/exams/', { params }),
    createExam: (data) => api.post('/admin/exams/', data),
    updateExam: (examId, data) => api.patch(`/admin/exams/${examId}/`, data),
    deleteExam: (examId) => api.delete(`/admin/exams/${examId}/`),
  },

  // 대기열 모니터링
  queue: {
    getRealTimeData: () => api.get('/admin/queue/realtime/'),
    getByDepartment: (params) => api.get('/admin/queue/by-department/', { params }),
    updateQueueStatus: (queueId, data) => api.patch(`/admin/queue/${queueId}/`, data),
    callPatient: (data) => api.post('/medical/queue/call-patient/', data),
    getMissingPatients: () => api.get('/medical/queue/missing-patients/'),
  },

  // 통계 및 분석
  analytics: {
    getHospitalStatus: () => api.get('/admin/monitor/hospital-status/'),
    getBottlenecks: () => api.get('/admin/monitor/congestion-forecast/'),
    getSystemAlerts: () => api.get('/admin/monitor/system-alerts/'),
  },
};

// WebSocket 연결 관리
export class WebSocketClient {
  constructor() {
    this.connections = new Map();
  }

  connect(endpoint, onMessage, onError = null, onOpen = null, onClose = null) {
    const wsUrl = `ws://localhost:8000/ws${endpoint}`;
    const ws = new WebSocket(wsUrl);
    
    // JWT 토큰을 WebSocket 연결에 추가
    const token = localStorage.getItem('admin_access_token');
    
    ws.onopen = () => {
      console.log(`WebSocket connected: ${endpoint}`);
      
      // 인증 메시지 전송
      if (token) {
        ws.send(JSON.stringify({
          type: 'authenticate',
          token: token
        }));
      }
      
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
      
      // 자동 재연결 시도 (5초 후)
      setTimeout(() => {
        if (!this.connections.has(endpoint)) {
          console.log(`Attempting to reconnect: ${endpoint}`);
          this.connect(endpoint, onMessage, onError, onOpen, onClose);
        }
      }, 5000);
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

// CSRF 토큰 초기화 함수
export const initializeCSRFToken = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/auth/csrf-token/', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      console.log('✅ CSRF token initialized successfully');
    } else {
      console.warn('❌ CSRF token request failed:', response.status);
    }
  } catch (error) {
    console.warn('❌ Failed to initialize CSRF token:', error.message);
  }
};

export default apiClient;