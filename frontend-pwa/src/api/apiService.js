import { api, authAPI, appointmentAPI, queueAPI, chatbotAPI, nfcAPI } from './client';

// API 서비스 - 환자 상태별 동적 UI를 위한 중앙화된 API 호출
const apiService = {
  // 환자 현재 상태 조회 (핵심 API)
  getPatientCurrentState: async () => {
    try {
      // 병렬로 여러 API를 호출하여 전체 환자 여정 데이터 수집
      const [userProfile, myQueue, todaySchedule] = await Promise.all([
        authAPI.getProfile(),
        queueAPI.getMyQueue().catch(() => null),
        api.get('/schedule/today').catch(() => ({ appointments: [] })),
      ]);

      // 현재 진행 중인 예약 찾기
      const currentAppointment = todaySchedule.appointments?.find(
        (apt) => apt.status === 'in_progress' || apt.status === 'waiting'
      );

      // 대기열 정보 추출
      const queueInfo = myQueue ? {
        queues: myQueue.queues || [],
        currentQueue: myQueue.current_queue || null,
        queuePosition: myQueue.position || null,
        estimatedWaitTime: myQueue.estimated_wait_time || null,
      } : {
        queues: [],
        currentQueue: null,
        queuePosition: null,
        estimatedWaitTime: null,
      };

      return {
        user: userProfile.user,
        state: userProfile.patient_state || 'UNREGISTERED',
        appointments: todaySchedule.appointments || [],
        currentAppointment,
        ...queueInfo,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to fetch patient current state:', error);
      throw error;
    }
  },

  // 환자 상태 업데이트
  updatePatientState: async (newState) => {
    return api.put('/status/update', { state: newState });
  },

  // 대기열 체크인
  checkInQueue: async (queueId) => {
    return api.post('/queue/checkin', { queue_id: queueId });
  },

  // 호출 확인 응답
  acknowledgeCall: async (queueId) => {
    return api.put('/queue/acknowledge-call', { queue_id: queueId });
  },

  // 당일 일정 조회
  getTodaySchedule: async () => {
    return api.get('/schedule/today');
  },

  // 내 대기 순서 조회
  getMyQueuePosition: async () => {
    return api.get('/queue/my-position');
  },

  // 검사 진행 상태
  getExamProgress: async (appointmentId) => {
    return api.get(`/exam/progress?appointment_id=${appointmentId}`);
  },

  // 검사 준비사항 조회
  getExamPreparation: async (appointmentId) => {
    return api.get(`/appointments/${appointmentId}/preparation`);
  },

  // 진료 완료 처리
  completeAppointment: async (appointmentId) => {
    return api.post(`/appointments/${appointmentId}/complete`);
  },

  // 결제 상태 조회
  getPaymentStatus: async () => {
    return api.get('/payment/status');
  },

  // 알림 설정 업데이트
  updateNotificationSettings: async (settings) => {
    return api.post('/queue/notification-settings', settings);
  },

  // 병원 정보 API
  hospital: {
    getInfo: () => api.get('/hospital/info'),
    getDepartments: () => api.get('/hospital/departments'),
    getMap: () => api.get('/hospital/map'),
    getFacilities: () => api.get('/hospital/facilities'),
    getFloorInfo: (floorId) => api.get(`/hospital/floors/${floorId}`),
    getVoiceGuide: (locationId) => api.get(`/hospital/voice-guide/${locationId}`),
  },

  // 네비게이션 API
  navigation: {
    calculateRoute: (data) => api.post('/navigation/route', data),
    getAccessibleRoute: (data) => api.post('/navigation/accessible-route', data),
    refreshRoute: (data) => api.post('/navigation/route-refresh', data),
    getVoiceGuide: (routeId) => api.get(`/navigation/voice-guide/${routeId}`),
    getCongestionAwareRoute: () => api.get('/navigation/congestion-aware-route'),
  },

  // NFC 관련 API (공개 정보)
  nfc: {
    getPublicInfo: (tagId) => api.post('/nfc/public-info', { tag_id: tagId }),
    scan: nfcAPI.scan,
    logScan: (data) => api.post('/nfc/scan-log', data),
    getQRBackup: (tagId) => api.get(`/nfc/qr-backup/${tagId}`),
  },

  // 인증 관련 (authAPI 래핑)
  auth: authAPI,

  // 예약 관련 (appointmentAPI 래핑)
  appointments: appointmentAPI,

  // 대기열 관련 (queueAPI 래핑)
  queue: queueAPI,

  // 챗봇 관련 (chatbotAPI 래핑)
  chatbot: chatbotAPI,

  // 가상 DB (EMR 중계) API
  virtualDB: {
    getPatientInfo: (emrId) => api.get(`/virtual-db/patient/${emrId}`),
    getSyncStatus: () => api.get('/virtual-db/sync-status'),
    refreshPatientData: (emrId) => api.post(`/virtual-db/refresh/${emrId}`),
  },

  // 분석 API (환자용 일부)
  analytics: {
    getMyPatientFlow: () => api.get('/analytics/patient-flow/me'),
    getMyWaitingHistory: () => api.get('/analytics/waiting-time/me'),
  },
};

export default apiService;