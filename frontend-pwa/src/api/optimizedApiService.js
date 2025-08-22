import axios from 'axios';
import { cacheUtils } from '../hooks/useOptimizedAPI';

// 통합 API 서비스 - 배치 처리 및 캐싱 최적화
class OptimizedApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    this.client = this.createClient();
  }

  createClient() {
    const client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // 요청 인터셉터 - JWT 토큰 자동 추가
    client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터 - 토큰 갱신 처리
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${this.baseURL}/auth/token/refresh/`, {
                refresh: refreshToken
              });
              
              const { access } = response.data;
              localStorage.setItem('access_token', access);
              
              // 관련 캐시 무효화
              cacheUtils.invalidate('auth|profile|schedule|queue');
              
              return client(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return client;
  }

  // 통합 환자 대시보드 데이터 (배치 처리)
  async getPatientDashboard(options = {}) {
    const { includeQueues = true, includeSchedule = true, includeProfile = true } = options;
    
    try {
      const requests = [];
      
      if (includeProfile) {
        requests.push(this.client.get('/auth/profile/'));
      }
      
      if (includeSchedule) {
        requests.push(this.client.get('/schedule/today'));
      }
      
      if (includeQueues) {
        requests.push(this.client.get('/queue/my-current/'));
      }

      const responses = await Promise.allSettled(requests);
      
      const result = {};
      let index = 0;
      
      if (includeProfile) {
        result.profile = responses[index].status === 'fulfilled' 
          ? responses[index].value.data 
          : null;
        index++;
      }
      
      if (includeSchedule) {
        result.schedule = responses[index].status === 'fulfilled' 
          ? responses[index].value.data 
          : { appointments: [] };
        index++;
      }
      
      if (includeQueues) {
        result.queues = responses[index].status === 'fulfilled' 
          ? responses[index].value.data 
          : [];
        index++;
      }

      return result;
    } catch (error) {
      console.error('환자 대시보드 데이터 로딩 실패:', error);
      throw error;
    }
  }

  // 통합 관리자 대시보드 데이터
  async getAdminDashboard() {
    try {
      const [hospitalStatus, queueStats, patientFlow] = await Promise.allSettled([
        this.client.get('/dashboard/monitor/hospital-status'),
        this.client.get('/queue/dashboard/realtime-data/'),
        this.client.get('/analytics/patient-flow')
      ]);

      return {
        hospitalStatus: hospitalStatus.status === 'fulfilled' ? hospitalStatus.value.data : null,
        queueStats: queueStats.status === 'fulfilled' ? queueStats.value.data : null,
        patientFlow: patientFlow.status === 'fulfilled' ? patientFlow.value.data : null,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('관리자 대시보드 데이터 로딩 실패:', error);
      throw error;
    }
  }

  // NFC 태그 스캔 최적화 (중복 스캔 방지)
  async scanNFCTag(tagData, options = {}) {
    const { skipDuplicateCheck = false } = options;
    
    try {
      // 공개 정보 먼저 확인 (캐시 활용)
      const publicInfo = await this.client.post('/nfc/public-info', {
        tag_uid: tagData.tag_uid || tagData.uid,
        code: tagData.code
      });

      // 로그인 사용자의 경우 추가 처리
      const token = localStorage.getItem('access_token');
      if (token) {
        const [scanResult, dashboardData] = await Promise.all([
          this.client.post('/nfc/scan/', tagData),
          this.getPatientDashboard({ includeQueues: true, includeSchedule: true, includeProfile: false })
        ]);

        return {
          publicInfo: publicInfo.data,
          scanResult: scanResult.data,
          dashboardData,
          timestamp: new Date().toISOString()
        };
      }

      return {
        publicInfo: publicInfo.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('NFC 스캔 처리 실패:', error);
      throw error;
    }
  }

  // 실시간 업데이트를 위한 최소 데이터 동기화
  async syncEssentialData() {
    try {
      const [queues, notifications] = await Promise.allSettled([
        this.client.get('/queue/my-current/'),
        this.client.get('/notifications/unread/')
      ]);

      return {
        queues: queues.status === 'fulfilled' ? queues.value.data : [],
        notifications: notifications.status === 'fulfilled' ? notifications.value.data : [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('필수 데이터 동기화 실패:', error);
      // 실시간 동기화는 실패해도 앱이 멈추면 안 됨
      return {
        queues: [],
        notifications: [],
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // 검사별 상세 정보 배치 로딩
  async getExamDetails(examIds) {
    if (!Array.isArray(examIds) || examIds.length === 0) {
      return {};
    }

    try {
      const requests = examIds.map(examId => 
        this.client.get(`/exams/${examId}/`).catch(error => ({
          error: true,
          examId,
          message: error.message
        }))
      );

      const responses = await Promise.allSettled(requests);
      
      const result = {};
      responses.forEach((response, index) => {
        const examId = examIds[index];
        if (response.status === 'fulfilled') {
          if (response.value.error) {
            result[examId] = { error: response.value.message };
          } else {
            result[examId] = response.value.data;
          }
        } else {
          result[examId] = { error: 'Network error' };
        }
      });

      return result;
    } catch (error) {
      console.error('검사 상세정보 배치 로딩 실패:', error);
      throw error;
    }
  }

  // 부서별 대기열 현황 (관리자용)
  async getDepartmentQueues(departments = []) {
    try {
      const requests = departments.length > 0
        ? departments.map(dept => this.client.get(`/queue/dashboard/by-department/?department=${dept}`))
        : [this.client.get('/queue/dashboard/by-department/')];

      const responses = await Promise.allSettled(requests);
      
      if (departments.length > 0) {
        const result = {};
        responses.forEach((response, index) => {
          const dept = departments[index];
          result[dept] = response.status === 'fulfilled' 
            ? response.value.data 
            : { error: 'Failed to load' };
        });
        return result;
      } else {
        return responses[0].status === 'fulfilled' 
          ? responses[0].value.data 
          : { error: 'Failed to load' };
      }
    } catch (error) {
      console.error('부서별 대기열 로딩 실패:', error);
      throw error;
    }
  }

  // 캐시 관리 메서드
  async refreshCache(patterns = []) {
    // 특정 패턴의 캐시만 무효화
    patterns.forEach(pattern => {
      cacheUtils.invalidate(pattern);
    });

    // 새로운 데이터로 캐시 예열 (선택적)
    if (patterns.includes('dashboard') || patterns.length === 0) {
      // 백그라운드에서 대시보드 데이터 미리 로딩
      setTimeout(() => {
        this.getPatientDashboard().catch(() => {
          // 캐시 예열 실패는 무시
        });
      }, 100);
    }
  }

  // 네트워크 상태 확인
  async checkConnectivity() {
    try {
      const response = await this.client.get('/health/', { timeout: 5000 });
      return {
        online: true,
        latency: Date.now() - response.config.metadata?.startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        online: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 싱글톤 인스턴스
const optimizedApiService = new OptimizedApiService();

export default optimizedApiService;