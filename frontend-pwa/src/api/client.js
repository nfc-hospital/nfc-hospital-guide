import axios from 'axios';

// API 클라이언트 생성
const apiClient = axios.create({
  baseURL: '/api/v1',  // Vite 프록시가 처리
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
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
  login: (credentials) => api.post('/auth/login/', credentials),
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

export default apiClient;