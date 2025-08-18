import { api, authAPI, appointmentAPI, queueAPI, chatbotAPI, nfcAPI } from './client';

// API 서비스 - 환자 상태별 동적 UI를 위한 중앙화된 API 호출
const apiService = {
  // 환자 현재 상태 조회 (핵심 API)
  getPatientCurrentState: async () => {
    try {
      console.log('🔍 getPatientCurrentState 호출됨');
      console.log('📍 현재 토큰:', localStorage.getItem('access_token')?.substring(0, 20) + '...');
      
      // 병렬로 여러 API를 호출하여 전체 환자 여정 데이터 수집
      const [userProfile, myQueue, todaySchedule] = await Promise.all([
        authAPI.getProfile(),
        queueAPI.getMyQueue().catch(() => null),
        api.get('/appointments/today').catch(() => ({ appointments: [] })),
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
        state: userProfile.state || 'UNREGISTERED',
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
    return api.get('/appointments/today');
  },

  // 검사(Exam) 관련 API 추가
  exams: {
    // 내 검사 목록 조회
    getMyList: async (params = {}) => {
      try {
        const response = await api.get('/exams/my-list/', { params });
        return response;
      } catch (error) {
        console.error('Failed to fetch my exams:', error);
        throw error;
      }
    },

    // 검사 결과 조회
    getResult: async (appointmentId) => {
      try {
        const response = await api.get(`/exams/${appointmentId}/result/`);
        return response;
      } catch (error) {
        console.error('Failed to fetch exam result:', error);
        throw error;
      }
    },

    // 검사 상세 정보 조회 - 올바른 엔드포인트 사용
    getDetail: async (examId) => {
      try {
        const response = await api.get(`/appointments/exams/${examId}/`);
        return response.data || response; // APIResponse 형식 처리
      } catch (error) {
        console.error('Failed to fetch exam detail:', error);
        throw error;
      }
    },

    // 모든 검사 목록 조회 (검사 선택용)
    getAllExams: async (params = {}) => {
      try {
        const response = await api.get('/appointments/exams/', { params });
        return response;
      } catch (error) {
        console.error('Failed to fetch all exams:', error);
        throw error;
      }
    }
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
    // 공개 정보 조회 (비로그인 사용자용)
    getPublicInfo: (tagId) => api.post('/nfc/public-info', { tag_id: tagId }),
    
    // NFC 스캔 (로그인 사용자용) - 이미 nfcAPI.scan으로 정의됨
    scan: nfcAPI.scan,
    
    // 스캔 로그 기록
    logScan: (data) => api.post('/nfc/scan-log', data),
    
    // QR 백업 생성
    getQRBackup: (tagId) => api.get(`/nfc/qr-backup/${tagId}`),
    
    // 태그 정보 조회 - 인증 상태에 따라 적절한 API 사용
    getTagInfo: async (tagId) => {
      try {
        const token = localStorage.getItem('access_token');
        
        if (token) {
          // 로그인한 사용자는 scan API 사용 (더 많은 정보 제공)
          console.log('🔐 로그인 사용자 - NFC scan API 호출');
          const response = await nfcAPI.scan({ tag_id: tagId });
          
          // 스캔 로그도 함께 기록
          api.post('/nfc/scan-log', { 
            tag_id: tagId, 
            timestamp: new Date().toISOString(),
            action_type: 'scan'
          }).catch(err => console.warn('스캔 로그 기록 실패:', err));
          
          return response;
        } else {
          // 비로그인 사용자는 공개 정보 API 사용
          console.log('👤 비로그인 사용자 - public-info API 호출');
          return api.post('/nfc/public-info', { tag_id: tagId });
        }
      } catch (error) {
        // 에러 발생 시 공개 정보 API로 폴백
        console.warn('NFC 태그 정보 조회 실패, 공개 API로 재시도:', error);
        return api.post('/nfc/public-info', { tag_id: tagId });
      }
    },
  },

  // 인증 관련 (authAPI 래핑)
  auth: authAPI,

  // 예약 관련 (appointmentAPI 래핑)
  appointments: appointmentAPI,

  // 대기열 관련 (queueAPI 래핑 + 추가 기능)
  queue: {
    ...queueAPI,
    // 특정 검사의 대기열 현황 조회
    getQueueByExam: async (examId) => {
      try {
        const response = await api.get('/queue/', { 
          params: { exam: examId, state: 'waiting' } 
        });
        return response;
      } catch (error) {
        console.error(`Failed to fetch queue for exam ${examId}:`, error);
        throw error;
      }
    },
    // 검사별 대기열 상태 조회 (여러 검사 한번에)
    getQueuesForExams: async (examIds) => {
      try {
        const promises = examIds.map(examId => 
          api.get('/queue/', { 
            params: { exam: examId, state__in: 'waiting,called,ongoing' } 
          }).catch(err => {
            console.warn(`Queue fetch failed for exam ${examId}:`, err);
            return { data: [] };
          })
        );
        const results = await Promise.all(promises);
        return results.map((result, index) => ({
          examId: examIds[index],
          queues: result.data || result || []
        }));
      } catch (error) {
        console.error('Failed to fetch queues for exams:', error);
        throw error;
      }
    },
    // 실시간 대기열 데이터 조회 (관리자용 API 활용)
    getRealtimeData: async () => {
      try {
        const response = await api.get('/queue/dashboard/realtime-data/');
        return response;
      } catch (error) {
        console.error('Failed to fetch realtime queue data:', error);
        throw error;
      }
    }
  },

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

  // 관리자 대시보드 API
  adminDashboard: {
    // 병원 전체 현황 요약 데이터
    getHospitalStatus: () => api.get('/dashboard/monitor/hospital-status'),
    
    // 시스템 알림 조회
    getSystemAlerts: () => api.get('/dashboard/monitor/system-alerts'),
    
    // 실시간 대기열 요약
    getQueueSummary: () => api.get('/queue/dashboard/realtime-data'),
    
    // 종합 대시보드 데이터 (여러 API를 한번에 호출)
    getSummary: async () => {
      try {
        const [queueRealtimeData, notifications] = await Promise.all([
          api.get('/queue/dashboard/realtime-data/').catch((error) => {
            console.warn('⚠️ Queue realtime data error:', error.message);
            return null;
          }),
          api.get('/dashboard/notifications/').catch((error) => {
            console.warn('⚠️ Notifications API error:', error.message);
            return { data: [] };
          })
        ]);
    
        // realtime-data API에서 summary 추출
        const summary = queueRealtimeData?.data?.summary || {};
        
        // 활성 환자 수 계산 (PatientState 기반 데이터 사용)
        const activePatients = 
          (summary.totalWaiting || 0) + 
          (summary.totalCalled || 0) + 
          (summary.totalInProgress || 0) + 
          (summary.totalPayment || 0);
    
        // notifications 처리
        const notificationsList = notifications?.data?.results || notifications?.data || [];
        const urgentAlerts = notificationsList
          .filter(notif => 
            notif.type === 'urgent' || 
            notif.type === 'system' ||
            notif.priority === 'high'
          )
          .slice(0, 10)
          .map(notif => ({
            id: notif.notification_id || notif.id,
            type: notif.priority === 'high' ? 'error' : 'warning',
            message: notif.message || notif.title || '알림',
            time: new Date(notif.created_at).toLocaleTimeString('ko-KR'),
            created_at: notif.created_at
          }));
    
        return {
          totalPatients: activePatients,
          totalWaiting: summary.totalWaiting || 0,  // ✅ 추가
          totalCalled: summary.totalCalled || 0,     // ✅ 추가
          avgWaitTime: Math.round(summary.avgWaitTime || 0),
          systemStatus: 'normal',  // hospital-status API가 없으므로 기본값
          urgentAlerts: urgentAlerts,
          queueSummary: summary,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Failed to fetch admin dashboard summary:', error);
        throw error;
      }
    },
  },

  // 챗봇 관련 API
  sendChatbotQuery: async (question, context = {}) => {
    try {
      const response = await chatbotAPI.query(question, context);
      return response;
    } catch (error) {
      console.error('Failed to send chatbot query:', error);
      throw error;
    }
  },

  getChatbotFAQ: async () => {
    try {
      const response = await chatbotAPI.getFAQ();
      return response;
    } catch (error) {
      console.error('Failed to get chatbot FAQ:', error);
      throw error;
    }
  },

  getChatbotSuggestions: async () => {
    try {
      const response = await chatbotAPI.getSuggestions();
      return response;
    } catch (error) {
      console.error('Failed to get chatbot suggestions:', error);
      throw error;
    }
  },
};

export default apiService;