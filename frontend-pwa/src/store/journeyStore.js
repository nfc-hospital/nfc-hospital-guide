import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import apiService from '../api/apiService';

const useJourneyStore = create(
  devtools(
    persist(
      (set, get) => ({
        // 로딩 및 에러 상태
        isLoading: false,
        error: null,
        lastFetchTime: null,

        // 사용자 정보
        user: null,
        patientState: null,

        // 예약 및 검사 정보
        appointments: [],
        currentAppointment: null,
        examProgress: null,

        // 대기열 정보
        queues: [],
        currentQueue: null,
        queuePosition: null,
        estimatedWaitTime: null,

        // 위치 정보
        currentLocation: null,
        navigationRoute: null,

        // 알림 설정
        notificationSettings: null,
        
        // 실시간 업데이트를 위한 폴링 ID
        pollingInterval: null,

        // 메인 데이터 페칭 함수
        fetchJourneyData: async () => {
          set({ isLoading: true, error: null });
          
          try {
            // API 호출하여 환자의 전체 여정 데이터 가져오기
            const response = await apiService.getPatientCurrentState();
            
            set({
              user: response.user,
              patientState: response.state,
              appointments: response.appointments,
              currentAppointment: response.currentAppointment,
              queues: response.queues,
              currentQueue: response.currentQueue,
              queuePosition: response.queuePosition,
              estimatedWaitTime: response.estimatedWaitTime,
              isLoading: false,
              lastFetchTime: new Date().toISOString(),
            });

            return response;
          } catch (error) {
            console.error('Failed to fetch journey data:', error);
            set({ error: error.message, isLoading: false });
            throw error;
          }
        },

        // 환자 상태 업데이트
        updatePatientState: async (newState) => {
          try {
            const response = await apiService.updatePatientState(newState);
            set({ patientState: response.state });
            return response;
          } catch (error) {
            console.error('Failed to update patient state:', error);
            set({ error: error.message });
            throw error;
          }
        },

        // 대기열 체크인
        checkInQueue: async (queueId) => {
          try {
            const response = await apiService.checkInQueue(queueId);
            await get().fetchJourneyData(); // 전체 데이터 새로고침
            return response;
          } catch (error) {
            console.error('Failed to check in queue:', error);
            set({ error: error.message });
            throw error;
          }
        },

        // 호출 확인
        acknowledgeCall: async (queueId) => {
          try {
            const response = await apiService.acknowledgeCall(queueId);
            await get().fetchJourneyData(); // 전체 데이터 새로고침
            return response;
          } catch (error) {
            console.error('Failed to acknowledge call:', error);
            set({ error: error.message });
            throw error;
          }
        },

        // 위치 업데이트
        updateLocation: (location) => {
          set({ currentLocation: location });
        },

        // 네비게이션 경로 설정
        setNavigationRoute: (route) => {
          set({ navigationRoute: route });
        },

        // 알림 설정 업데이트
        updateNotificationSettings: async (settings) => {
          try {
            const response = await apiService.updateNotificationSettings(settings);
            set({ notificationSettings: response.settings });
            return response;
          } catch (error) {
            console.error('Failed to update notification settings:', error);
            set({ error: error.message });
            throw error;
          }
        },

        // 실시간 업데이트 시작 (5초 간격)
        startPolling: () => {
          const interval = setInterval(() => {
            get().fetchJourneyData();
          }, 5000);
          
          set({ pollingInterval: interval });
        },

        // 실시간 업데이트 중지
        stopPolling: () => {
          const interval = get().pollingInterval;
          if (interval) {
            clearInterval(interval);
            set({ pollingInterval: null });
          }
        },

        // 전체 상태 초기화 (로그아웃 시)
        clearJourneyData: () => {
          get().stopPolling();
          
          set({
            isLoading: false,
            error: null,
            lastFetchTime: null,
            user: null,
            patientState: null,
            appointments: [],
            currentAppointment: null,
            examProgress: null,
            queues: [],
            currentQueue: null,
            queuePosition: null,
            estimatedWaitTime: null,
            currentLocation: null,
            navigationRoute: null,
            notificationSettings: null,
            pollingInterval: null,
          });
        },

        // 에러 상태 클리어
        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'journey-storage',
        partialize: (state) => ({
          // 로컬 스토리지에 저장할 항목들
          user: state.user,
          patientState: state.patientState,
          notificationSettings: state.notificationSettings,
          lastFetchTime: state.lastFetchTime,
        }),
      }
    )
  )
);

export default useJourneyStore;