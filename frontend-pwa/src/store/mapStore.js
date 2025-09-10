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
          
          // 2. hospital_navigation API로 경로 요청 (optimized pathfinding 사용)
          try {
            // 좌표 기반으로 가장 가까운 노드 ID 찾기 (임시 구현)
            const startNodeId = get().findNearestNodeId(currentPos.x_coord || 100, currentPos.y_coord || 400);
            const endNodeId = get().findNearestNodeId(nextExam.x_coord || 500, nextExam.y_coord || 300);
            
            console.log('🎯 노드 매핑:', {
              시작위치: currentPos,
              목적지: nextExam,
              시작노드ID: startNodeId,
              종료노드ID: endNodeId
            });
            
            // 요청 데이터 검증
            const requestData = {
              start_node_id: startNodeId,
              end_node_id: endNodeId
            };
            
            console.log('📡 API 요청 데이터:', requestData, {
              start_type: typeof startNodeId,
              end_type: typeof endNodeId,
              start_value: startNodeId,
              end_value: endNodeId
            });
            
            // 요청 데이터 유효성 검증
            if (!startNodeId || !endNodeId) {
              console.error('❌ 유효하지 않은 노드 ID:', { startNodeId, endNodeId });
              throw new Error('유효하지 않은 노드 ID');
            }
            
            console.log('🔍 백엔드 테스트용 - 알려진 노드 ID로 직접 테스트:');
            console.log('계단(5ab149dc-4f28-4ff7-92f2-e066eec52db4) → 안내데스크(497071c2-a868-408c-9595-3cb597b15bae)');
            
            console.log('🚀 API 호출 시도: navigation.calculateRoute (MockNFC와 동일한 방식)');
            
            // 🆘 TEMPORARY: 404 오류 디버깅을 위해 알려진 유효한 노드 ID로 강제 테스트
            const KNOWN_START_NODE = '5ab149dc-4f28-4ff7-92f2-e066eec52db4'; // 계단
            const KNOWN_END_NODE = '497071c2-a868-408c-9595-3cb597b15bae'; // 안내데스크
            
            console.warn('🆘 DEBUGGING: 실제 노드 ID 대신 알려진 유효한 노드 ID로 강제 테스트');
            console.log('원래 요청:', { startNodeId, endNodeId });
            console.log('테스트 요청:', { KNOWN_START_NODE, KNOWN_END_NODE });
            
            // MockNFC와 동일한 방식으로 navigation.js API 직접 사용
            const { calculateRoute } = await import('../api/navigation');
            const response = await calculateRoute(KNOWN_START_NODE, KNOWN_END_NODE);
            
            const routeData = response?.data?.data || response?.data || response;
            
            if (routeData && routeData.coordinates) {
              // coordinates 배열에서 nodes 정보 추출 (새로운 API 형식)
              const nodes = routeData.coordinates.map((point, index) => ({
                id: `node_${index}`,  // 임시 ID
                x: point.x,
                y: point.y,
                name: `Point ${index + 1}`,
                floor: 1,  // 기본값
                building: '본관',  // 기본값
                map_id: 'main_1f'  // 기본값
              }));
              
              // nodes 배열에서 추가 정보가 있으면 사용
              if (routeData.nodes && routeData.nodes.length > 0) {
                routeData.nodes.forEach((nodeInfo, index) => {
                  if (nodes[index]) {
                    nodes[index].id = nodeInfo.node_id;
                    nodes[index].name = nodeInfo.name;
                  }
                });
              }
              
              // edges 생성 (연속된 노드들을 연결)
              const edges = [];
              for (let i = 0; i < nodes.length - 1; i++) {
                edges.push([nodes[i].id, nodes[i + 1].id]);
              }
              
              console.log('✅ optimized pathfinding 경로 변환 완료:', {
                원본: routeData,
                변환된_nodes: nodes,
                변환된_edges: edges
              });
              
              // 3. 경로 데이터 상태 업데이트
              set({ 
                activeRoute: {
                  nodes: nodes,
                  edges: edges,
                  total_distance: routeData.distance || 0,
                  estimated_time: routeData.estimatedTime || 0,
                  floors_involved: [1], // 기본값
                  has_floor_transitions: false
                },
                navigationRoute: {
                  nodes: nodes,
                  edges: edges,
                  route_data: routeData
                },
                destinationLocation: nextExam,
                isRouteLoading: false 
              });
              
              // 4. LocationStore와 동기화 (경로 정보)
              try {
                const { default: useLocationStore } = await import('./locationStore');
                const locationStore = useLocationStore.getState();
                
                locationStore.setRoute(
                  routeData.coordinates || [],  // coordinates 배열
                  endNodeId,  // 목적지 노드 ID
                  nextExam.title || nextExam.room || '목적지'  // 목적지 이름
                );
                
                console.log('🔄 LocationStore와 MapStore 경로 동기화 완료');
              } catch (syncError) {
                console.error('LocationStore 동기화 실패:', syncError);
              }
              
              return;
            }
          } catch (apiError) {
            console.log('❌ hospital_navigation API 실패, 간단한 직선 경로로 폴백:', apiError);
            
            // API 실패시 간단한 직선 경로 생성 (폴백 로직 간소화)
            const startPoint = currentPos.room || currentPos.description || '현재 위치';
            const endPoint = nextExam.title || nextExam.room || '목적지';
            
            const routeData = {
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
            
            console.log('✅ 폴백 성공: 직선 경로 생성', routeData);
            
            // 경로 데이터 저장
            if (routeData && routeData.nodes && routeData.nodes.length > 0) {
              set({
                routeNodes: routeData.nodes,
                routeEdges: routeData.edges || [],
                navigationRoute: routeData,
                isRouteLoading: false
              });
              console.log('✅ 폴백 경로 설정 완료');
            } else {
              set({
                routeNodes: [],
                routeEdges: [],
                navigationRoute: null,
                isRouteLoading: false
              });
              console.log('⚠️ 폴백 경로 생성 실패');
            }
            return;
          }
          
          // 성공적으로 API에서 처리된 경우는 이미 위에서 처리됨
          console.log('✅ API 경로 처리 완료');
          
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

      // 좌표 기반으로 가장 가까운 노드 ID 찾기
      findNearestNodeId: (x, y) => {
        // 실제 백엔드 NavigationNode 데이터 (2024-09-10 업데이트)
        const navigationNodes = [
          { id: '5ab149dc-4f28-4ff7-92f2-e066eec52db4', x: 780, y: 380, name: '계단' },
          { id: '497071c2-a868-408c-9595-3cb597b15bae', x: 680, y: 515, name: '안내데스크' },
          { id: 'f3921a92-7157-4f73-8483-f9b970ecf089', x: 800, y: 220, name: '암센터 연결통로' },
          { id: '650fa82e-595b-4232-b27f-ee184b4fce14', x: 530, y: 320, name: '약국' },
          { id: 'a8182b6e-5c7c-43f6-8cf9-a71b830f10bf', x: 355, y: 355, name: '엘리베이터' },
          { id: '260fa931-7998-464c-a487-37851f29f8b1', x: 380, y: 520, name: '원무과' },
          { id: 'c8df7038-7685-4970-bb69-935c2d4f187e', x: 680, y: 370, name: '은행' },
          { id: '558d94af-a1cf-4b89-95c2-8e948d33e230', x: 50, y: 100, name: '응급의료센터' },
          { id: 'c1e6d4ba-fd28-40fe-93b3-0fdb6d924a40', x: 450, y: 65, name: '정문' },
          { id: 'aa5d9906-f645-4f71-b1cd-a6f383d8602c', x: 480, y: 160, name: '진단검사의학과' },
          { id: 'ef3108ff-36a4-4522-8ad3-e983028fb55d', x: 680, y: 160, name: '채혈실' },
          { id: '5ff1846d-d7d3-4aef-ac0c-0a8228632594', x: 530, y: 420, name: '카페' },
          { id: 'bb9918e8-17b8-4c1e-9c20-9ab25ab146ff', x: 140, y: 400, name: '헌혈실' },
          { id: '6e44c258-c1c4-4cd7-ab12-7216e240f7f6', x: 180, y: 495, name: '화장실' },
          { id: '6f41d9d2-60fd-4748-adb7-2034974de5e7', x: 450, y: 410, name: '간호사실' },
          { id: '0b600c0e-3659-4c1f-bb47-0a06991b95bd', x: 780, y: 280, name: '계단' },
          { id: '93a299d9-1718-4d4b-a751-6330200ba494', x: 450, y: 140, name: '내과 대기실' },
          { id: '61028404-48ed-4382-b2ff-e86b0043d595', x: 215, y: 290, name: '내과 진료실 1' },
          { id: '388769ac-681c-4be0-9f08-01804e669615', x: 365, y: 290, name: '내과 진료실 2' },
          { id: '2c012a36-2422-41fb-a040-4fa7b9598dec', x: 515, y: 290, name: '내과 진료실 3' },
          { id: '62acb987-0d9e-42f5-a0b7-0aa1729d7331', x: 685, y: 430, name: '상담실' },
          { id: 'e856d440-b156-4b51-ab19-20d180aad4c1', x: 450, y: 520, name: '엘리베이터' },
          { id: '7d27e28f-429d-4c43-b263-9431905e8b92', x: 215, y: 430, name: '처치실' },
          { id: 'f611a5bc-2da4-4cbc-bb6a-33c965ffd402', x: 80, y: 280, name: '화장실' },
          { id: '5ac2fe24-5610-428e-84bc-3411333cd10f', x: 740, y: 270, name: '방사선치료실' },
          { id: 'aebfff74-5872-46c0-b1e3-27408552c4c4', x: 50, y: 140, name: '본관 연결통로' },
          { id: 'c378971a-7f84-49c7-8731-69b0d7823690', x: 150, y: 250, name: '상담실 1' },
          { id: 'b13103b6-a77a-47f7-97f4-d7f7dd0fdf8f', x: 150, y: 390, name: '상담실 2' },
          { id: '6c784391-270c-4e92-a2dc-20f718741064', x: 450, y: 300, name: '암센터 로비' },
          { id: '824f4a58-2014-4998-ba28-fc2a64718c7d', x: 150, y: 160, name: '암센터 입구' },
          { id: '6226d2bd-5ebd-4621-aed6-c0e81b289d91', x: 580, y: 500, name: '엘리베이터' },
          { id: '80132509-1f9a-43bd-b937-57a8c81f7229', x: 450, y: 130, name: '치료 대기실' },
          { id: '094a9afb-c602-4d89-9c63-8bcbfee176ff', x: 740, y: 130, name: '항암치료실' },
          { id: '88167a31-16ea-4d28-a7bc-c76282a2d7c7', x: 750, y: 465, name: '화장실' },
          { id: 'a107c6b6-a973-4921-b1dc-24195871941f', x: 390, y: 500, name: '휴게실' }
        ];

        // 유클리드 거리 계산으로 가장 가까운 노드 찾기
        let nearestNode = navigationNodes[0];
        let minDistance = Math.sqrt(Math.pow(x - nearestNode.x, 2) + Math.pow(y - nearestNode.y, 2));

        for (const node of navigationNodes) {
          const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
          if (distance < minDistance) {
            minDistance = distance;
            nearestNode = node;
          }
        }

        console.log(`📍 좌표 (${x}, ${y})에서 가장 가까운 노드: ${nearestNode.name} (ID: ${nearestNode.id}, 거리: ${Math.round(minDistance)})`);
        return nearestNode.id;
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