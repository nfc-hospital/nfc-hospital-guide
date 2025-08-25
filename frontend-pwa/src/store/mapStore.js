import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import apiService from '../api/apiService';

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

      // 특정 층 지도 로드
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
            set({ 
              currentFloorMap: { ...data.map, floor_id: floorId },
              currentFloorNodes: data.nodes || []
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

      // 현재 위치 업데이트
      updateCurrentLocation: (location) => {
        set({ 
          currentLocation: {
            ...location,
            timestamp: new Date().toISOString()
          }
        });
      },
      
      // ✅ 위치 변경 시 자동으로 경로 업데이트 (hospital_navigation API 사용)
      updateRouteBasedOnLocation: async (newLocation, customDestination = null) => {
        // newLocation이 없으면 기본 위치 사용 (정문 로비)
        const currentPos = newLocation || {
          room: '정문 로비',
          description: '병원 입구',
          x_coord: 150,
          y_coord: 400,
          building: '본관',
          floor: '1'
        };
        
        set({ isRouteLoading: true });
        
        try {
          // 1. 목적지 결정: customDestination이 있으면 우선 사용, 없으면 journeyStore에서 가져오기
          let nextExam = customDestination;
          
          if (!customDestination) {
            const { default: useJourneyStore } = await import('./journeyStore');
            const journeyState = useJourneyStore.getState();
            nextExam = journeyState.getNextExam();
          }
          
          const apiService = (await import('../api/apiService')).default;
          
          if (!nextExam) {
            console.log('📍 다음 목적지가 없어 경로 계산 스킵');
            set({ 
              activeRoute: null, 
              navigationRoute: null,
              isRouteLoading: false 
            });
            return;
          }
          
          console.log('🗺️ hospital_navigation API로 경로 요청:', {
            from: currentPos.room || currentPos.description,
            to: nextExam.title
          });
          
          // 2. hospital_navigation API로 경로 요청
          try {
            // NFC 스캔 기반 경로 안내 API 사용
            const response = await apiService.navigation.nfcScanNavigate({
              tag_id: currentPos.tag_id || 'default-location',
              target_exam_id: nextExam.exam_id,
              target_location: nextExam.title,
              is_accessible: false,
              avoid_stairs: false,
              avoid_crowded: false
            });
            
            const routeData = response?.data || response;
            
            if (routeData && routeData.steps) {
              // steps 배열에서 nodes와 edges 추출
              const nodes = routeData.steps.map(step => ({
                id: step.node_id,
                x: step.x_coord,
                y: step.y_coord,
                name: step.node_name,
                floor: step.floor,
                building: step.building
              }));
              
              // edges 생성 (연속된 노드들을 연결)
              const edges = [];
              for (let i = 0; i < nodes.length - 1; i++) {
                edges.push([nodes[i].id, nodes[i + 1].id]);
              }
              
              console.log('✅ hospital_navigation 경로 변환 완료:', {
                원본: routeData,
                변환된_nodes: nodes,
                변환된_edges: edges
              });
              
              // 3. 경로 데이터 상태 업데이트
              set({ 
                activeRoute: {
                  nodes: nodes,
                  edges: edges,
                  total_distance: routeData.total_distance,
                  estimated_time: routeData.estimated_time
                },
                navigationRoute: {
                  nodes: nodes,
                  edges: edges,
                  route_id: routeData.route_id
                },
                destinationLocation: nextExam,
                isRouteLoading: false 
              });
              
              return;
            }
          } catch (apiError) {
            console.log('hospital_navigation API 실패, FacilityRoute로 폴백:', apiError);
          }
          
          // 3. API 실패시 FacilityRoute (map-editor) 폴백
          const { getFacilityRoute, getAllFacilityRoutes, getDemoRoute } = await import('../api/facilityRoutes');
          const startPoint = currentPos.room || currentPos.description || '현재 위치';
          const endPoint = nextExam.title || nextExam.room || '목적지';
          const routeName = `${startPoint}_${endPoint}`;
          
          let routeData = null;
          
          // 3-1. 먼저 정확한 경로 찾기
          try {
            console.log(`🔍 1단계: 정확한 경로 검색 (${routeName})`);
            const facilityRoute = await getFacilityRoute(routeName);
            routeData = facilityRoute;
            console.log('✅ 1단계 성공: 정확한 경로 찾음', routeData);
          } catch (error) {
            console.log(`⚠️ 1단계 실패: ${error.message}`);
            
            // 3-2. 데모 경로 확인
            console.log(`🔍 2단계: 데모 경로 검색`);
            const demoRoute = getDemoRoute(endPoint) || getDemoRoute(routeName);
            if (demoRoute && demoRoute.nodes && demoRoute.nodes.length > 0) {
              routeData = demoRoute;
              console.log('✅ 2단계 성공: 데모 경로 사용', demoRoute);
            } else {
              console.log('⚠️ 2단계 실패: 데모 경로 없음');
              
              // 3-3. 모든 경로 목록에서 관련 경로 찾기
              try {
                console.log('🔍 3단계: 전체 경로에서 관련 경로 검색');
                const allRoutes = await getAllFacilityRoutes();
                
                if (Array.isArray(allRoutes) && allRoutes.length > 0) {
                  // 목적지 이름이 포함된 경로 찾기
                  const relatedRoute = allRoutes.find(route => {
                    if (!route || typeof route !== 'object') return false;
                    const name = String(route.facility_name || route.name || '');
                    return name.includes(endPoint) || name.includes(nextExam.title);
                  });
                  
                  if (relatedRoute && relatedRoute.nodes && relatedRoute.nodes.length > 0) {
                    routeData = relatedRoute;
                    console.log('✅ 3단계 성공: 관련 경로 찾음', relatedRoute.facility_name);
                  }
                }
              } catch (err) {
                console.log('⚠️ 3단계 실패:', err.message);
              }
            }
          }
          
          // 4. 그래도 유효한 경로 데이터가 없으면 직선 경로 생성
          if (!routeData || !routeData.nodes || routeData.nodes.length === 0) {
            console.log('🔍 4단계: 기본 직선 경로 생성');
            routeData = {
              nodes: [
                {
                  id: 'start',
                  x: currentPos.x_coord || 150,
                  y: currentPos.y_coord || 400,
                  name: startPoint
                },
                {
                  id: 'end',
                  x: nextExam.x_coord || 340,
                  y: nextExam.y_coord || 210,
                  name: endPoint
                }
              ],
              edges: [['start', 'end']]
            };
            console.log('✅ 4단계 성공: 직선 경로 생성', routeData);
          }
          
          // 5. 최종 경로 데이터 상태 업데이트
          set({ 
            activeRoute: routeData,
            navigationRoute: {
              nodes: routeData.nodes || [],
              edges: routeData.edges || [],
              facilityName: routeData.facility_name || routeName
            },
            destinationLocation: nextExam,
            isRouteLoading: false 
          });
          
          console.log('✅ 최종 경로 설정 완료');
          
        } catch (error) {
          console.error('❌ 경로 업데이트 실패:', error);
          set({ 
            activeRoute: null,
            navigationRoute: null,
            isRouteLoading: false,
            mapError: error.message 
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
      
      // ✅ '탐색 모드'를 위한 시설 네비게이션
      navigateToFacility: async (facility) => {
        console.log('🏢 시설 탐색 모드로 전환:', facility);
        
        // 탐색 모드로 전환하고 목적지 설정
        set({ 
          navigationMode: 'explore',
          destinationLocation: facility 
        });
        
        // 현재 위치 가져오기 (정문 로비를 기본값으로)
        const currentLocation = {
          room: '정문 로비',
          description: '병원 입구',
          x_coord: 150,
          y_coord: 400,
          building: '본관',
          floor: '1'
        };
        
        // 선택한 시설까지의 경로 계산
        await get().updateRouteBasedOnLocation(currentLocation, facility);
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
          mapError: null
        });
      }
    }),
    {
      name: 'map-store'
    }
  )
);

export default useMapStore;