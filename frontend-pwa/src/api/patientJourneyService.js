import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Axios instance with auth token
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken
        });
        
        localStorage.setItem('access_token', response.data.access);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const PatientJourneyAPI = {
  /**
   * 현재 환자 상태 조회
   * @returns {Promise} 환자 여정 상태 정보
   */
  getCurrentState: async () => {
    try {
      const response = await apiClient.get('/queue/patient-journey/current_state/');
      return response;
    } catch (error) {
      console.error('Failed to get current state:', error);
      throw error;
    }
  },
  
  /**
   * 액션 수행을 통한 상태 전이
   * @param {string} actionType - 수행할 액션 타입
   * @param {Object} payload - 액션에 필요한 추가 데이터
   * @returns {Promise} 변경된 상태 정보
   */
  performAction: async (actionType, payload = {}) => {
    try {
      const response = await apiClient.post('/queue/patient-journey/perform_action/', {
        action_type: actionType,
        payload
      });
      return response;
    } catch (error) {
      console.error('Failed to perform action:', error);
      throw error;
    }
  },
  
  /**
   * 상태 정의 조회 (공개 API)
   * @returns {Promise} 상태 정의 정보
   */
  getStateDefinitions: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/state-definitions/`);
      return response.data;
    } catch (error) {
      console.error('Failed to get state definitions:', error);
      throw error;
    }
  }
};

// 기존 API와의 호환성을 위한 브릿지 함수들
export const migrateToNewAPI = {
  // 기존 함수명 유지하되 새 API 호출
  getPatientCurrentState: () => PatientJourneyAPI.getCurrentState(),
  
  updatePatientState: (state) => PatientJourneyAPI.performAction('manual_update', { state }),
  
  // 마이그레이션 추적
  logMigration: (oldFunc, newFunc) => {
    if (import.meta.env.DEV) {
      console.warn(`Migration: ${oldFunc} → ${newFunc}`);
    }
  }
};

export default PatientJourneyAPI;