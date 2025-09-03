// frontend-pwa/src/store/locationStore.js
/**
 * 물리적 위치 관리 전용 스토어
 * 로그인 여부와 관계없이 사용자의 현재 위치(가장 최근 NFC 스캔 위치)만을 관리
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useLocationStore = create(
  persist(
    (set, get) => ({
      // =====================
      // 상태 (State)
      // =====================
      
      // 현재 물리적 위치 (가장 최근 스캔한 NFC 태그 정보)
      currentLocation: null,
      
      // 위치 관련 로딩 상태
      isLocationLoading: false,
      
      // 위치 관련 에러
      locationError: null,
      
      // 위치 히스토리 (최근 5개 위치 기록)
      locationHistory: [],
      
      // 마지막 스캔 시간
      lastScanTime: null,

      // =====================
      // 액션 (Actions)  
      // =====================

      /**
       * 현재 위치 설정
       * @param {Object} locationData - NFC 태그 위치 정보
       */
      setCurrentLocation: (locationData) => {
        const timestamp = new Date().toISOString();
        
        set((state) => ({
          currentLocation: {
            ...locationData,
            timestamp,
          },
          lastScanTime: timestamp,
          locationError: null,
          // 히스토리에 추가 (최대 5개 유지)
          locationHistory: [
            {
              ...locationData,
              timestamp,
            },
            ...state.locationHistory.slice(0, 4)
          ]
        }));
        
        console.log('📍 위치 업데이트:', locationData?.room || locationData?.building);
      },

      /**
       * 위치 로딩 상태 설정
       * @param {boolean} loading - 로딩 여부
       */
      setLocationLoading: (loading) => {
        set({ isLocationLoading: loading });
      },

      /**
       * 위치 에러 설정
       * @param {string|null} error - 에러 메시지
       */
      setLocationError: (error) => {
        set({ 
          locationError: error,
          isLocationLoading: false 
        });
      },

      /**
       * 현재 위치 정보 반환 (읽기 전용)
       * @returns {Object|null} 현재 위치 정보
       */
      getCurrentLocation: () => {
        return get().currentLocation;
      },

      /**
       * 현재 위치의 태그 코드 반환
       * @returns {string|null} 태그 코드 (예: 'TAG001')
       */
      getCurrentTagCode: () => {
        const location = get().currentLocation;
        return location?.code || location?.tag_code || location?.tag_id || null;
      },

      /**
       * 현재 위치의 표시용 이름 반환
       * @returns {string} 위치 이름 (예: '1층 접수처')
       */
      getCurrentLocationName: () => {
        const location = get().currentLocation;
        if (!location) return '위치 정보 없음';
        
        return location.location_name || 
               location.room || 
               `${location.building} ${location.floor}층` ||
               '알 수 없는 위치';
      },

      /**
       * 특정 시간 이전 위치 히스토리 정리
       * @param {number} hoursAgo - 몇 시간 전 (기본: 24시간)
       */
      cleanupLocationHistory: (hoursAgo = 24) => {
        const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
        
        set((state) => ({
          locationHistory: state.locationHistory.filter(
            location => location.timestamp > cutoffTime
          )
        }));
      },

      /**
       * 모든 위치 정보 초기화
       */
      clearLocationData: () => {
        set({
          currentLocation: null,
          isLocationLoading: false,
          locationError: null,
          locationHistory: [],
          lastScanTime: null,
        });
        
        console.log('📍 위치 정보 초기화 완료');
      },

      /**
       * 에러 상태만 클리어
       */
      clearLocationError: () => {
        set({ locationError: null });
      },

      // =====================
      // 유틸리티 함수들
      // =====================

      /**
       * 현재 위치가 유효한지 확인
       * @returns {boolean}
       */
      hasValidLocation: () => {
        const location = get().currentLocation;
        return !!(location && get().getCurrentTagCode());
      },

      /**
       * 위치가 특정 시간 내에 스캔되었는지 확인
       * @param {number} minutesAgo - 몇 분 이내 (기본: 30분)
       * @returns {boolean}
       */
      isLocationRecent: (minutesAgo = 30) => {
        const lastScan = get().lastScanTime;
        if (!lastScan) return false;
        
        const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
        return new Date(lastScan) > cutoffTime;
      },
    }),
    {
      name: 'location-store', // localStorage 키
      partialize: (state) => ({
        // 현재 위치와 히스토리만 영구 저장 (로딩/에러 상태는 제외)
        currentLocation: state.currentLocation,
        locationHistory: state.locationHistory,
        lastScanTime: state.lastScanTime,
      }),
    }
  )
);

export default useLocationStore;