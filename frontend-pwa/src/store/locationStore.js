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
      // 좌표 기반 위치 정보 (NavigationNode용)
      // =====================
      
      // 현재 노드 ID (NavigationNode)
      currentNodeId: null,
      
      // 현재 좌표 (SVG 지도용)
      currentPosition: { x: 0, y: 0 },
      
      // 현재 지도 ID (예: main_1f, main_2f)
      currentMapId: 'main_1f',
      
      // =====================
      // 경로 안내 관련 상태
      // =====================
      
      // 계산된 경로 좌표 배열
      routeCoordinates: [],
      
      // 경로 안내 활성 여부
      isRouteActive: false,
      
      // 목적지 정보
      destinationNodeId: null,
      destinationName: '',

      // =====================
      // 액션 (Actions)  
      // =====================

      /**
       * 현재 위치 설정 (기존 + 좌표 정보 추가)
       * @param {Object} locationData - NFC 태그 위치 정보
       * @param {Object} coordinateData - 좌표 및 노드 정보 (선택사항)
       */
      setCurrentLocation: (locationData, coordinateData = {}) => {
        const timestamp = new Date().toISOString();

        set((state) => ({
          currentLocation: {
            ...locationData,
            timestamp,
          },
          lastScanTime: timestamp,
          locationError: null,
          
          // 좌표 기반 위치 정보 업데이트
          currentNodeId: coordinateData.node_id || null,
          currentPosition: coordinateData.position || { x: 0, y: 0 },
          currentMapId: coordinateData.map_id || state.currentMapId,
          
          // 히스토리에 추가 (최대 5개 유지)
          locationHistory: [
            {
              ...locationData,
              timestamp,
            },
            ...state.locationHistory.slice(0, 4)
          ]
        }));
        
        console.log('📍 위치 업데이트:', locationData?.room || locationData?.building, 
                   coordinateData.position ? `(${coordinateData.position.x}, ${coordinateData.position.y})` : '');
      },

      /**
       * 좌표 기반 위치만 업데이트 (NavigationNode 기반) - 강화된 버전
       * @param {string} nodeId - NavigationNode ID
       * @param {Object} position - {x, y} 좌표
       * @param {string} mapId - 지도 ID
       * @param {Object} additionalInfo - 추가 위치 정보
       */
      setCoordinateLocation: (nodeId, position, mapId, additionalInfo = {}) => {
        const timestamp = new Date().toISOString();
        
        // 🔍 입력 데이터 검증
        if (!nodeId) {
          console.error('❌ setCoordinateLocation: nodeId가 필수입니다');
          return false;
        }
        
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
          console.error('❌ setCoordinateLocation: 유효하지 않은 position:', position);
          return false;
        }
        
        console.log('📍 좌표 위치 업데이트 시작:', {
          nodeId,
          position,
          mapId,
          additionalInfo
        });
        
        const newState = {
          currentNodeId: nodeId,
          currentPosition: position,
          currentMapId: mapId,
          lastScanTime: timestamp,
          locationError: null,

          // 기존 currentLocation도 업데이트 (호환성 유지)
          currentLocation: {
            node_id: nodeId,
            position: position,
            map_id: mapId,
            location_name: additionalInfo.location_name || '',
            building: additionalInfo.building || '',
            floor: additionalInfo.floor || '1층',
            room: additionalInfo.room || '',
            timestamp,
          }
        };
        
        set(newState);
        
        // 🔍 상태 설정 후 즉시 검증
        setTimeout(() => {
          const currentState = get();
          const isValid = currentState.currentNodeId === nodeId && 
                         currentState.currentPosition.x === position.x &&
                         currentState.currentPosition.y === position.y;
          
          if (isValid) {
            console.log('✅ 좌표 위치 설정 성공 검증 완료:', {
              location: `${additionalInfo.location_name || 'Unknown'} (${position.x}, ${position.y})`,
              nodeId: currentState.currentNodeId,
              persisted: true
            });
          } else {
            console.error('❌ 좌표 위치 설정 실패 - 상태 불일치:', {
              expected: { nodeId, position },
              actual: { 
                nodeId: currentState.currentNodeId, 
                position: currentState.currentPosition 
              }
            });
            // 재시도
            set(newState);
          }
        }, 50);
        
        return true;
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

        // 데이터가 이미 표준화되었으므로 복잡한 처리 없이 바로 사용합니다.
        return location.location_name ||
               location.room ||
               `${location.building} ${location.floor}` ||
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
       * 경로 설정
       * @param {Array} coordinates - 경로 좌표 배열 [{x, y}, ...]
       * @param {string} destinationNodeId - 목적지 노드 ID
       * @param {string} destinationName - 목적지 이름
       */
      setRoute: (coordinates, destinationNodeId, destinationName) => {
        set({
          routeCoordinates: coordinates || [],
          isRouteActive: true,
          destinationNodeId,
          destinationName
        });
        
        console.log('🗺️ 경로 설정됨:', {
          coordinateCount: coordinates?.length || 0,
          destinationName,
          destinationNodeId
        });
      },

      /**
       * 경로 초기화
       */
      clearRoute: () => {
        set({
          routeCoordinates: [],
          isRouteActive: false,
          destinationNodeId: null,
          destinationName: ''
        });
        
        console.log('🚫 경로 정보 초기화됨');
      },

      /**
       * 지도 변경 (층간 이동 등)
       * @param {string} mapId - 새로운 지도 ID
       */
      changeMap: (mapId) => {
        set({ currentMapId: mapId });
        console.log('🏢 지도 변경됨:', mapId);
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
          
          // 좌표 기반 위치 정보 초기화
          currentNodeId: null,
          currentPosition: { x: 0, y: 0 },
          currentMapId: 'main_1f',
          
          // 경로 정보 초기화
          routeCoordinates: [],
          isRouteActive: false,
          destinationNodeId: null,
          destinationName: ''
        });
        
        console.log('📍 모든 위치 정보 초기화 완료');
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

      // =====================
      // 좌표 기반 Getter 함수들
      // =====================

      /**
       * 현재 좌표 위치 정보 반환
       * @returns {Object} 좌표 기반 위치 정보
       */
      getCurrentCoordinateLocation: () => {
        const state = get();
        return {
          nodeId: state.currentNodeId,
          position: state.currentPosition,
          mapId: state.currentMapId,
          isSet: !!state.currentNodeId
        };
      },

      /**
       * 경로 정보 반환
       * @returns {Object} 경로 관련 정보
       */
      getRouteInfo: () => {
        const state = get();
        return {
          isActive: state.isRouteActive,
          coordinates: state.routeCoordinates,
          destinationNodeId: state.destinationNodeId,
          destinationName: state.destinationName,
          coordinateCount: state.routeCoordinates.length
        };
      },

      /**
       * 현재 상태 요약 반환 - 강화된 디버깅 정보 포함
       * @returns {string} 현재 위치 요약
       */
      getLocationSummary: () => {
        const state = get();
        
        if (state.currentLocation) {
          return state.currentLocation.location_name || 
                 `${state.currentLocation.building} ${state.currentLocation.room}` ||
                 '위치 설정됨';
        }
        
        if (state.currentNodeId) {
          return `좌표: (${state.currentPosition.x}, ${state.currentPosition.y})`;
        }
        
        return '위치가 설정되지 않음';
      },
      
      /**
       * 🔍 상태 진단 및 검증 유틸리티
       * @returns {Object} 상세한 상태 진단 정보
       */
      getStateValidation: () => {
        const state = get();
        const now = new Date();
        const lastScan = state.lastScanTime ? new Date(state.lastScanTime) : null;
        const timeSinceLastScan = lastScan ? now - lastScan : null;
        
        return {
          // 기본 상태 정보
          hasCurrentLocation: !!state.currentLocation,
          hasCurrentNodeId: !!state.currentNodeId,
          hasValidPosition: state.currentPosition.x !== 0 || state.currentPosition.y !== 0,
          
          // 시간 관련 정보
          lastScanTime: state.lastScanTime,
          timeSinceLastScan: timeSinceLastScan ? Math.floor(timeSinceLastScan / 1000) : null,
          isRecentScan: timeSinceLastScan ? timeSinceLastScan < 30 * 60 * 1000 : false, // 30분 이내
          
          // 일관성 검증
          nodeIdLocationConsistent: !!(state.currentNodeId && state.currentLocation?.node_id && 
                                      state.currentNodeId === state.currentLocation.node_id),
          
          // 디버깅 정보
          currentState: {
            nodeId: state.currentNodeId,
            position: state.currentPosition,
            mapId: state.currentMapId,
            locationName: state.currentLocation?.location_name
          }
        };
      },

      /**
       * 좌표가 설정되어 있는지 확인 - 강화된 검증
       * @returns {boolean}
       */
      hasCoordinateLocation: () => {
        const state = get();
        const isValid = !!(state.currentNodeId && state.currentPosition.x !== 0 && state.currentPosition.y !== 0);
        
        if (!isValid) {
          console.log('🔍 hasCoordinateLocation 검증 실패:', {
            currentNodeId: state.currentNodeId,
            currentPosition: state.currentPosition,
            hasNodeId: !!state.currentNodeId,
            hasValidX: state.currentPosition.x !== 0,
            hasValidY: state.currentPosition.y !== 0
          });
        }
        
        return isValid;
      },
    }),
    {
      name: 'location-store', // localStorage 키
      
      // 🔧 상태 지속성 강화 설정
      version: 1, // 스키마 버전 명시
      
      // 🔄 버전 간 마이그레이션 함수
      migrate: (persistedState, version) => {
        console.log('🔄 LocationStore 마이그레이션 실행:', { persistedState, version });
        
        // 버전 0 (초기) → 버전 1
        if (version === 0) {
          // 기존 상태가 있다면 새로운 스키마에 맞게 변환
          const migratedState = {
            // 기존 필드 유지
            currentLocation: persistedState.currentLocation || null,
            locationHistory: persistedState.locationHistory || [],
            lastScanTime: persistedState.lastScanTime || null,
            currentNodeId: persistedState.currentNodeId || null,
            currentPosition: persistedState.currentPosition || { x: 0, y: 0 },
            currentMapId: persistedState.currentMapId || 'main_1f',
            
            // 새로운 필드 기본값 설정 (런타임에서 계산되는 것들)
            isLocationLoading: false,
            locationError: null,
            routeCoordinates: [],
            isRouteActive: false,
            destinationNodeId: null,
            destinationName: ''
          };
          
          console.log('✅ 버전 0→1 마이그레이션 완료:', migratedState);
          return migratedState;
        }
        
        // 같은 버전이면 그대로 반환
        return persistedState;
      },
      
      partialize: (state) => ({
        // 현재 위치와 히스토리만 영구 저장 (로딩/에러 상태는 제외)
        currentLocation: state.currentLocation,
        locationHistory: state.locationHistory,
        lastScanTime: state.lastScanTime,
        
        // 좌표 기반 위치 정보도 영구 저장 (핵심 부분)
        currentNodeId: state.currentNodeId,
        currentPosition: state.currentPosition,
        currentMapId: state.currentMapId,
        
        // 경로 정보는 세션에서만 유지 (영구 저장하지 않음)
      }),
      
      // 🔧 상태 복원 시 검증 및 초기화 로직
      onRehydrateStorage: (state) => {
        console.log('📦 LocationStore 상태 복원 시작...');
        
        return (state, error) => {
          if (error) {
            console.error('❌ LocationStore 상태 복원 실패:', error);
            return;
          }
          
          if (state) {
            console.log('✅ LocationStore 상태 복원 완료:', {
              currentNodeId: state.currentNodeId,
              currentLocation: state.currentLocation?.location_name || 'N/A',
              lastScanTime: state.lastScanTime
            });
            
            // 🔍 복원된 상태 검증
            if (state.currentNodeId && !state.currentLocation) {
              console.warn('⚠️ currentNodeId는 있지만 currentLocation이 없음 - 동기화 필요');
            }
            
            if (!state.currentNodeId && state.currentLocation) {
              console.warn('⚠️ currentLocation은 있지만 currentNodeId가 없음 - 강화된 복구 시도');
              
              let recoveredNodeId = null;
              
              // 1차: currentLocation.node_id 직접 추출
              if (state.currentLocation.node_id) {
                recoveredNodeId = state.currentLocation.node_id;
                console.log('🔧 복구 방법 1: currentLocation.node_id 사용:', recoveredNodeId);
              }
              
              // 2차: facilityManagement.js에서 위치명 기반 매칭
              if (!recoveredNodeId && state.currentLocation.location_name) {
                try {
                  // 동적 import를 통해 facilityManagement 데이터 로드
                  import('../data/facilityManagement').then(({ ALL_FACILITIES }) => {
                    const matchedFacility = ALL_FACILITIES.find(facility => 
                      facility.name === state.currentLocation.location_name ||
                      facility.room === state.currentLocation.room ||
                      state.currentLocation.location_name?.includes(facility.name) ||
                      (state.currentLocation.location_name?.includes('약국') && facility.id === 'pharmacy') ||
                      (state.currentLocation.location_name?.includes('수납') && facility.id === 'administration') ||
                      (state.currentLocation.location_name?.includes('안내') && facility.id === 'info-desk')
                    );
                    
                    if (matchedFacility?.node_id) {
                      // 상태 업데이트 (복원 후 설정)
                      set({ currentNodeId: matchedFacility.node_id });
                      console.log('🔧 복구 방법 2: facilityManagement 매칭 성공:', {
                        locationName: state.currentLocation.location_name,
                        matchedFacility: matchedFacility.name,
                        recoveredNodeId: matchedFacility.node_id
                      });
                    } else {
                      console.warn('❌ facilityManagement 매칭 실패:', state.currentLocation.location_name);
                    }
                  }).catch(error => {
                    console.error('❌ facilityManagement 로드 실패:', error);
                  });
                } catch (error) {
                  console.error('❌ 동적 import 실패:', error);
                }
              }
              
              // 1차 복구가 성공한 경우 즉시 적용
              if (recoveredNodeId) {
                state.currentNodeId = recoveredNodeId;
                console.log('✅ 즉시 복구 완료:', recoveredNodeId);
              }
            }
          } else {
            console.log('🆕 LocationStore 초기 상태로 시작');
          }
        };
      },
    }
  )
);

export default useLocationStore;