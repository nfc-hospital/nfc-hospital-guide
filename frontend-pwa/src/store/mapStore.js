import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import apiService from '../api/apiService';
import useLocationStore from './locationStore';

/**
 * 지도 및 네비게이션 관련 상태 관리 Store
 * hospital_navigation 백엔드와 연동
 */
const useMapStore = create(
  devtools(
    (set, get) => ({
      // 지도 메타데이터
      mapMetadata: null,
      svgBaseUrl: '/images/maps/',
      
      
      // ✅ 네비게이션 모드 ('journey': 여정 자동 안내, 'explore': 수동 탐색)
      navigationMode: 'journey',
      
      // 현재 층 정보
      currentFloorMap: null,
      currentFloorNodes: [],
      currentMapId: 'main_1f', // 현재 표시 중인 지도 ID
      
      // 위치 정보
      currentLocation: null,
      destinationLocation: null,
      
      // 경로 정보
      navigationRoute: null,
      activeRoute: null,
      routeProgress: [],
      isRouteLoading: false,
      routeError: null, // 사용자 친화적 경로 오류 메시지
      
      // 진료과/시설 존 정보
      departmentZones: [],
      
      // 로딩 상태
      isMapLoading: false,
      mapError: null,

      // 지도 메타데이터 로드
      loadMapMetadata: async () => {
        if (get().mapMetadata) return get().mapMetadata; // 이미 로드된 경우 스킵
        
        set({ isMapLoading: true, mapError: null });
        try {
          const response = await apiService.navigation.getMapsMetadata();
          const data = response?.data || response;
          
          if (data?.maps) {
            set({ 
              mapMetadata: data.maps,
              svgBaseUrl: data.svg_base_url || '/images/maps/'
            });
            return data;
          }
          return null;
        } catch (error) {
          console.error('지도 메타데이터 로드 실패:', error);
          set({ mapError: error.message });
          return null;
        } finally {
          set({ isMapLoading: false });
        }
      },

      // 특정 층 지도 로드 (백엔드에서 SVG + 메타데이터)
      loadFloorMap: async (floorId) => {
        const currentMap = get().currentFloorMap;
        
        // 이미 로드된 층인지 확인
        if (currentMap?.floor_id === floorId) {
          return currentMap;
        }
        
        set({ isMapLoading: true, mapError: null });
        try {
          const response = await apiService.navigation.getHospitalMap(floorId);
          const data = response?.data || response;
          
          if (data) {
            // SVG 내용과 메타데이터 저장
            set({ 
              currentFloorMap: { 
                floor_id: floorId,
                building: data.building,
                floor: data.floor,
                svg_content: data.svg_content,
                svg_url: data.svg_url,
                width: data.metadata?.width || 900,
                height: data.metadata?.height || 600,
                ...data.metadata?.map
              },
              currentFloorNodes: data.metadata?.nodes || [],
              currentMapId: floorId
            });
            return data;
          }
          return null;
        } catch (error) {
          console.error('층 지도 로드 실패:', error);
          set({ mapError: error.message });
          return null;
        } finally {
          set({ isMapLoading: false });
        }
      },

      // 진료과/시설 존 정보 로드
      loadDepartmentZones: async (params = {}) => {
        try {
          const response = await apiService.navigation.getDepartmentZones(params);
          const data = response?.data || response;
          
          if (data?.zones) {
            set({ departmentZones: data.zones });
            return data.zones;
          }
          return [];
        } catch (error) {
          console.error('진료과 정보 로드 실패:', error);
          return [];
        }
      },

      // NFC 스캔 기반 경로 안내
      startNavigation: async (tagId, targetExamId, targetLocation) => {
        set({ isMapLoading: true, mapError: null });
        try {
          const response = await apiService.navigation.nfcScanNavigate({
            tag_id: tagId,
            target_exam_id: targetExamId,
            target_location: targetLocation,
            is_accessible: false,
            avoid_stairs: false,
            avoid_crowded: false
          });
          
          const data = response?.data || response;
          if (data) {
            set({
              activeRoute: data,
              navigationRoute: data,
              destinationLocation: {
                node_id: data.end_node,
                name: data.end_node_name || targetLocation,
                exam_id: targetExamId
              }
            });
            return data;
          }
          return null;
        } catch (error) {
          console.error('경로 안내 시작 실패:', error);
          set({ mapError: error.message });
          throw error;
        } finally {
          set({ isMapLoading: false });
        }
      },

      // 경로 완료/취소
      completeRoute: async (routeId, completionType = 'completed', notes = '') => {
        try {
          const response = await apiService.navigation.completeRoute({
            route_id: routeId,
            completion_type: completionType,
            notes: notes
          });
          
          if (response?.success) {
            set({
              activeRoute: null,
              navigationRoute: null,
              destinationLocation: null,
              routeProgress: []
            });
          }
          return response;
        } catch (error) {
          console.error('경로 종료 실패:', error);
          throw error;
        }
      },

      // ✅ 최종 통합 핵심 함수: 시설까지의 경로 계산 (모든 로직 통합)
      calculateRouteToFacility: async (destinationFacility) => {
        console.log('🎯 시설 경로 계산 시작:', destinationFacility);
        
        // 1️⃣ 로딩 상태 시작 및 상태 초기화
        set({ 
          isRouteLoading: true, 
          routeError: null, 
          activeRoute: null,
          navigationMode: 'explore',
          destinationLocation: destinationFacility 
        });

        try {
          // 2️⃣ 현재 위치는 오직 locationStore에서만 조회 (단일 진실 공급원)
          const startNodeId = useLocationStore.getState().currentNodeId;
          const endNodeId = destinationFacility.node_id;
          const destinationName = destinationFacility.name || destinationFacility.title || '목적지';
          let fallbackUsed = false;  // fallback 사용 여부 추적
          let actualStartNodeId = startNodeId;  // 실제 사용된 시작 노드 ID
          
          console.log('📍 경로 계산 노드:', { 
            시작: startNodeId, 
            목적지: endNodeId, 
            목적지명: destinationName 
          });
          
          // 3️⃣ 사전 검증 - 현재 위치
          if (!startNodeId) {
            set({
              routeError: "현재 위치를 알 수 없습니다. NFC를 먼저 스캔해주세요.",
              isRouteLoading: false
            });
            console.warn('⚠️ 현재 위치가 설정되지 않음');
            return;
          }

          // 4️⃣ 사전 검증 - 목적지
          if (!endNodeId) {
            set({
              routeError: "목적지 정보가 올바르지 않습니다.",
              isRouteLoading: false
            });
            console.warn('⚠️ 목적지 노드 ID가 유효하지 않음:', endNodeId);
            return;
          }

          console.log('🚀 API 호출 시작:', {
            from: startNodeId,
            to: endNodeId
          });

          // 5️⃣-A 수동 경로 먼저 확인 (map-editor에서 만든 경로)
          try {
            const { getFacilityRoute } = await import('../api/facilityRoutes');
            const facilityName = destinationFacility.name || destinationFacility.title;
            const manualRoute = await getFacilityRoute(facilityName);

            if (manualRoute?.nodes?.length > 0) {
              console.log('✅ 수동 경로 사용:', facilityName, {
                nodeCount: manualRoute.nodes.length,
                edgeCount: manualRoute.edges.length,
                mapId: manualRoute.map_id
              });

              // 수동 경로를 activeRoute에 설정
              set({
                activeRoute: {
                  nodes: manualRoute.nodes,
                  edges: manualRoute.edges,
                  total_distance: 0,
                  estimated_time: 0,
                  manual_route: true
                },
                navigationRoute: {
                  nodes: manualRoute.nodes,
                  edges: manualRoute.edges,
                  map_id: manualRoute.map_id
                },
                routeError: null,
                isRouteLoading: false,
                currentMapId: manualRoute.map_id || 'main_1f'
              });

              console.log('✅ 수동 경로 설정 완료');
              return; // 수동 경로 사용했으므로 자동 계산 스킵
            }
          } catch (error) {
            console.log('🔄 수동 경로 없음, 자동 계산 진행:', error.message);
          }

          // 5️⃣-B 수동 경로 없으면 기존 자동 경로 계산 (백엔드 API)
          const { calculateRoute } = await import('../api/navigation');
          const response = await calculateRoute(startNodeId, endNodeId);
          
          // 6️⃣ 성공 처리 - API 응답 구조 상세 분석
          console.log('🔍 DEBUG API 응답 전체 구조:', {
            response_success: response?.success,
            response_has_data: !!response?.data,
            response_data_keys: response?.data ? Object.keys(response.data) : null,
            coordinates_exists: !!response?.data?.coordinates,
            coordinates_is_array: Array.isArray(response?.data?.coordinates),
            coordinates_length: response?.data?.coordinates?.length || 0,
            response_error: response?.error,
            response_message: response?.message,
            full_response_json: JSON.stringify(response, null, 2)
          });

          // 백엔드 응답이 중첩되어 있을 가능성 체크
          console.log('🔍 DEBUG 중첩 데이터 분석:', {
            response_data_data_exists: !!response?.data?.data,
            response_data_data_keys: response?.data?.data ? Object.keys(response.data.data) : null,
            nested_coordinates_exists: !!response?.data?.data?.coordinates,
            nested_coordinates_length: response?.data?.data?.coordinates?.length || 0
          });
          
          // 다양한 데이터 구조 대응
          let routeData = null;
          if (response?.data?.coordinates) {
            // 직접 data에 coordinates가 있는 경우
            routeData = response.data;
            console.log('✅ 직접 구조 사용: response.data');
          } else if (response?.data?.data?.coordinates) {
            // 중첩된 data.data에 coordinates가 있는 경우
            routeData = response.data.data;
            console.log('✅ 중첩 구조 사용: response.data.data');
          } else {
            // 둘 다 없으면 원래대로
            routeData = response.data;
            console.log('⚠️ 기본값 사용: response.data');
          }
          
          if (response.success && routeData?.coordinates?.length > 0) {
            console.log('✅ 경로 데이터 수신 성공:', {
              coordinatesCount: routeData.coordinates.length,
              distance: routeData.distance,
              estimatedTime: routeData.estimatedTime
            });

            // coordinates 배열에서 nodes 정보 추출
            const nodes = routeData.coordinates.map((point, index) => ({
              id: `node_${index}`,
              x: point.x,
              y: point.y,
              name: index === 0 ? '출발지' : 
                    index === routeData.coordinates.length - 1 ? destinationName : 
                    `경유지 ${index}`,
              floor: 1,
              building: '본관',
              map_id: 'main_1f'
            }));

            // edges 생성 (연속된 노드들을 연결)
            const edges = [];
            for (let i = 0; i < nodes.length - 1; i++) {
              edges.push([nodes[i].id, nodes[i + 1].id]);
            }

            // 7️⃣ 상태 업데이트 (최종)
            set({
              activeRoute: {
                nodes: nodes,
                edges: edges,
                total_distance: routeData.distance || 0,
                estimated_time: routeData.estimatedTime || 0,
                floors_involved: [1],
                has_floor_transitions: false
              },
              navigationRoute: {
                nodes: nodes,
                edges: edges,
                route_data: routeData
              },
              routeError: fallbackUsed ? `경로 계산 성공 (기본 시작점 사용)` : null,
              isRouteLoading: false
            });

            // 8️⃣ LocationStore와 동기화 (경로 정보)
            try {
              const locationStore = useLocationStore.getState();
              locationStore.setRoute(
                routeData.coordinates || [],
                endNodeId,
                destinationName
              );
              console.log('🔄 LocationStore와 MapStore 경로 동기화 완료');
            } catch (syncError) {
              console.error('LocationStore 동기화 실패:', syncError);
              // 동기화 실패해도 경로 표시는 유지
            }

            console.log('✅ 시설 경로 계산 및 설정 완료', {
              fallbackUsed: fallbackUsed,
              startNodeId: actualStartNodeId,
              destinationName: destinationName,
              routeLength: routeData.coordinates?.length || 0
            });
            
            // Fallback 사용 시 추가 알림
            if (fallbackUsed) {
              console.log('🔔 경로 계산 완료 알림: 기본 출발점(안내데스크)에서 목적지까지 경로가 계산되었습니다.');
            }
          } else {
            throw new Error('유효한 경로 데이터를 받지 못했습니다.');
          }

        } catch (error) {
          // 9️⃣ 실패 처리 - 오프라인 모드 폴백 포함
          console.error('❌ 시설 경로 계산 실패:', error);
          
          // 네트워크 오류나 404 에러인 경우 오프라인 모드로 폴백
          if (error.message?.includes('네트워크') || error.message?.includes('404') || !navigator.onLine) {
            console.log('🔄 오프라인 모드로 폴백 처리 중...');
            
            // 오프라인 목적지 설정 (좌표 기반)
            if (destinationFacility?.coordinates) {
              set({
                // 오프라인 경로 정보 설정
                activeRoute: {
                  nodes: [{ 
                    name: '현재 위치',
                    coordinates: useLocationStore.getState().coordinates || { x: 0, y: 0 }
                  }, {
                    name: destinationName,
                    coordinates: destinationFacility.coordinates
                  }],
                  coordinates: [
                    useLocationStore.getState().coordinates || { x: 0, y: 0 },
                    destinationFacility.coordinates
                  ],
                  total_distance: 0,  // 오프라인에서는 계산 불가
                  estimated_time: 0,
                  offline_mode: true
                },
                navigationRoute: {
                  destination: destinationName,
                  coordinates: destinationFacility.coordinates,
                  offline_mode: true
                },
                routeError: null,  // 오프라인 모드에서는 에러 클리어
                isRouteLoading: false
              });
              
              console.log('✅ 오프라인 모드로 목적지 설정됨:', destinationName);
            } else {
              // 좌표 정보도 없는 경우
              set({
                routeError: "오프라인 모드: 경로 계산을 할 수 없지만, 목적지 정보는 설정되었습니다.",
                activeRoute: null,
                navigationRoute: {
                  destination: destinationName,
                  offline_mode: true,
                  error: true
                },
                isRouteLoading: false
              });
            }
          } else {
            // 기타 오류의 경우 기존 처리
            set({
              routeError: "경로 계산에 실패했습니다. 잠시 후 다시 시도해주세요.",
              activeRoute: null,
              navigationRoute: null,
              isRouteLoading: false
            });
          }
        }
      },

      // ✅ 기존 함수 (하위 호환성 유지, 새 함수로 리다이렉트)
      calculateRouteToDestination: async (destinationNodeId, destinationName = '목적지') => {
        console.log('🎯 경로 계산 시작:', { destinationNodeId, destinationName });
        
        // 1️⃣ 로딩 상태 시작 및 에러 초기화
        set({ isRouteLoading: true, routeError: null });

        try {
          // 2️⃣ 현재 위치 검증 (locationStore에서만 조회)
          const currentNodeId = useLocationStore.getState().currentNodeId;
          console.log('📍 현재 위치 노드 ID:', currentNodeId);
          
          if (!currentNodeId) {
            set({
              routeError: "현재 위치를 확인하기 위해 NFC 태그를 스캔해주세요.",
              isRouteLoading: false
            });
            console.warn('⚠️ 현재 위치가 설정되지 않음');
            return;
          }

          // 3️⃣ 목적지 유효성 검사
          if (!destinationNodeId) {
            set({
              routeError: "목적지 정보가 올바르지 않습니다.",
              isRouteLoading: false
            });
            console.warn('⚠️ 목적지 노드 ID가 유효하지 않음:', destinationNodeId);
            return;
          }

          console.log('🚀 API 호출 시작:', { 
            from: currentNodeId, 
            to: destinationNodeId 
          });

          // 4️⃣ API 호출 (navigation.js를 직접 import하여 사용)
          const { calculateRoute } = await import('../api/navigation');
          const response = await calculateRoute(currentNodeId, destinationNodeId);
          
          // 5️⃣ 성공 처리
          const routeData = response?.data?.data || response?.data || response;
          
          if (routeData?.coordinates && Array.isArray(routeData.coordinates)) {
            console.log('✅ 경로 데이터 수신 성공:', {
              coordinatesCount: routeData.coordinates.length,
              distance: routeData.distance,
              estimatedTime: routeData.estimatedTime
            });

            // coordinates 배열에서 nodes 정보 추출
            const nodes = routeData.coordinates.map((point, index) => ({
              id: `node_${index}`,
              x: point.x,
              y: point.y,
              name: index === 0 ? '출발지' : 
                    index === routeData.coordinates.length - 1 ? destinationName : 
                    `경유지 ${index}`,
              floor: 1,
              building: '본관',
              map_id: 'main_1f'
            }));

            // edges 생성 (연속된 노드들을 연결)
            const edges = [];
            for (let i = 0; i < nodes.length - 1; i++) {
              edges.push([nodes[i].id, nodes[i + 1].id]);
            }

            // 6️⃣ 상태 업데이트
            set({
              activeRoute: {
                nodes: nodes,
                edges: edges,
                total_distance: routeData.distance || 0,
                estimated_time: routeData.estimatedTime || 0,
                floors_involved: [1],
                has_floor_transitions: false
              },
              navigationRoute: {
                nodes: nodes,
                edges: edges,
                route_data: routeData
              },
              destinationLocation: {
                node_id: destinationNodeId,
                name: destinationName
              },
              routeError: null,
              isRouteLoading: false
            });

            // 7️⃣ LocationStore와 동기화 (경로 정보)
            try {
              const locationStore = useLocationStore.getState();
              locationStore.setRoute(
                routeData.coordinates || [],
                destinationNodeId,
                destinationName
              );
              console.log('🔄 LocationStore와 MapStore 경로 동기화 완료');
            } catch (syncError) {
              console.error('LocationStore 동기화 실패:', syncError);
              // 동기화 실패해도 경로 표시는 유지
            }

            console.log('✅ 경로 계산 및 설정 완료');
          } else {
            throw new Error('유효한 경로 데이터를 받지 못했습니다.');
          }

        } catch (error) {
          // 8️⃣ 실패 처리
          console.error('❌ 경로 계산 실패:', error);
          set({
            routeError: "경로를 계산하는 데 실패했습니다. 잠시 후 다시 시도해주세요.",
            activeRoute: null,
            navigationRoute: null,
            isRouteLoading: false
          });
        }
      },

      // 현재 위치 업데이트
      updateCurrentLocation: (location) => {
        set({ 
          currentLocation: {
            ...location,
            timestamp: new Date().toISOString()
          }
        });
      },
      
      // 현재 위치 설정 (단순 설정)
      setCurrentLocation: (location) => {
        set({ currentLocation: location });
      },

      // ✅ 새로운 경로 설정 함수 (백엔드 API 응답 직접 처리)
      setNavigationPath: (pathData) => {
        if (!pathData) {
          set({ 
            activeRoute: null, 
            navigationRoute: null,
            destinationLocation: null
          });
          return;
        }

        const { from, to, path, timestamp } = pathData;
        
        // 경로 데이터를 지도 표시용 형식으로 변환
        const nodes = [];
        const edges = [];
        
        // 시작점 추가
        if (from) {
          nodes.push({
            id: from.tag_id,
            x: from.x_coord || 0,
            y: from.y_coord || 0,
            name: from.room || from.description,
            floor: from.floor,
            building: from.building
          });
        }
        
        // 경로 steps를 nodes로 변환
        if (path && path.steps) {
          path.steps.forEach((step, index) => {
            // 중간 노드 추가 (필요시)
            if (step.node) {
              nodes.push({
                id: step.node.id || `step-${index}`,
                x: step.node.x || 0,
                y: step.node.y || 0,
                name: step.instruction,
                floor: step.node.floor,
                building: step.node.building
              });
            }
          });
        }
        
        // 도착점 추가
        if (to) {
          nodes.push({
            id: to.tag_id,
            x: to.x_coord || 0,
            y: to.y_coord || 0,
            name: to.room || to.description,
            floor: to.floor,
            building: to.building
          });
        }
        
        // edges 생성 (연속된 노드들을 연결)
        for (let i = 0; i < nodes.length - 1; i++) {
          edges.push([nodes[i].id, nodes[i + 1].id]);
        }
        
        console.log('📍 경로 설정 완료:', {
          nodes: nodes.length,
          edges: edges.length,
          distance: path?.distance,
          time: path?.estimated_time
        });
        
        // 상태 업데이트
        set({ 
          activeRoute: {
            nodes,
            edges,
            total_distance: path?.distance || 0,
            estimated_time: path?.estimated_time || 0
          },
          navigationRoute: {
            nodes,
            edges,
            timestamp
          },
          destinationLocation: to,
          currentLocation: from
        });
      },
      
      // ✅ 단순화된 경로 업데이트 함수 (새로운 통합 함수 사용)
      updateRouteBasedOnLocation: async (newLocation, customDestination = null) => {
        console.log('🔄 updateRouteBasedOnLocation 호출, 새 함수로 리다이렉트');
        
        try {
          // 1. 목적지 결정: customDestination이 있으면 우선 사용, 없으면 journeyStore에서 가져오기
          let destination = customDestination;
          
          if (!customDestination) {
            const { default: useJourneyStore } = await import('./journeyStore');
            const journeyState = useJourneyStore.getState();
            destination = journeyState.getNextExam();
          }
          
          if (!destination) {
            console.log('📍 다음 목적지가 없어 경로 계산 스킵');
            set({ 
              activeRoute: null, 
              navigationRoute: null,
              routeError: null
            });
            return;
          }
          
          // 2. 새로운 통합 핵심 함수로 직접 호출
          await get().calculateRouteToFacility(destination);
          
        } catch (error) {
          console.error('❌ 위치 기반 경로 업데이트 실패:', error);
          set({ 
            routeError: "경로 업데이트에 실패했습니다.",
            isRouteLoading: false
          });
        }
      },

      // 목적지 설정
      setDestination: (location) => {
        set({ destinationLocation: location });
      },
      
      // ✅ 네비게이션 모드 변경
      setNavigationMode: (mode) => {
        console.log(`🔄 네비게이션 모드 변경: ${mode}`);
        set({ navigationMode: mode });
      },
      
      // ✅ 단순화된 시설 네비게이션 (새로운 통합 함수 사용)
      navigateToFacility: async (facility) => {
        console.log('🏢 navigateToFacility 호출, 새 함수로 리다이렉트:', facility);
        
        // 새로운 통합 핵심 함수로 직접 호출
        await get().calculateRouteToFacility(facility);
      },

      // 경로 진행 상황 업데이트
      updateRouteProgress: (progress) => {
        const currentProgress = get().routeProgress || [];
        set({ 
          routeProgress: [...currentProgress, {
            ...progress,
            timestamp: new Date().toISOString()
          }]
        });
      },

      // 특정 층의 노드 찾기
      findNodeByExam: (examId) => {
        const nodes = get().currentFloorNodes;
        return nodes.find(node => 
          node.exam?.exam_id === examId ||
          node.exam_id === examId
        );
      },

      // 특정 층의 노드 찾기 (이름으로)
      findNodeByName: (name) => {
        const nodes = get().currentFloorNodes;
        return nodes.find(node => 
          node.name?.includes(name) ||
          node.room?.includes(name)
        );
      },

      // ❌ findNearestNodeId 함수 제거됨 - locationStore.currentNodeId를 직접 사용


      // ✅ 특정 위치에 맞는 지도 로드
      loadMapForLocation: (location) => {
        if (!location?.building || !location?.floor) {
          console.warn("지도 로드를 위한 위치 정보 부족:", location);
          return;
        }
        
        // ✅ '층'이라는 글자와 모든 문자열을 제거하고 숫자만 남깁니다.
        const floorNumber = String(location.floor).replace(/[^0-9]/g, '');
        
        // 예: building: '본관', floor: '1층' -> 'main_1f'
        const buildingMap = {
          '본관': 'main',
          '별관': 'annex',
          '암센터': 'cancer'
        };
        
        const buildingCode = buildingMap[location.building] || 'main';
        // ✅ 숫자만 사용하여 올바른 mapId를 생성합니다. (결과: 'main_1f')
        const mapId = `${buildingCode}_${floorNumber}f`;
        
        // 이미 로드된 지도이면 스킵
        if (get().currentMapId === mapId) return;

        console.log(`🗺️ 새로운 지도 로딩: ${mapId}`);
        
        set({ 
          currentMapId: mapId
        });
      },

      // SVG 크기 정보 가져오기
      getMapDimensions: (building, floor) => {
        const metadata = get().mapMetadata;
        if (!metadata) return { width: 900, height: 600 };
        
        const mapInfo = metadata.find(m => 
          m.building === building && 
          m.floor === parseInt(floor)
        );
        
        return {
          width: mapInfo?.width || 900,
          height: mapInfo?.height || 600,
          scale: mapInfo?.scale || 1
        };
      },

      // ✅ 경로 오류 상태 관리 함수들
      setRouteError: (message) => {
        set({ 
          routeError: message,
          isRouteLoading: false,
          activeRoute: null 
        });
        console.warn('⚠️ 경로 오류 설정:', message);
      },

      clearRouteError: () => {
        set({ routeError: null });
        console.log('✅ 경로 오류 초기화');
      },

      // 상태 초기화
      clearMapData: () => {
        set({
          currentLocation: null,
          destinationLocation: null,
          navigationRoute: null,
          activeRoute: null,
          routeProgress: [],
          currentFloorMap: null,
          currentFloorNodes: [],
          departmentZones: [],
          isMapLoading: false,
          mapError: null,
          routeError: null // 경로 오류도 초기화
        });
      }
    }),
    {
      name: 'map-store'
    }
  )
);

export default useMapStore;