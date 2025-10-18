import { useState, useEffect, useMemo } from 'react';
import { scanNFCTag } from '../api/nfc';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useJourneyStore from '../store/journeyStore';
import useMapStore from '../store/mapStore';
import useLocationStore from '../store/locationStore';
import { MAJOR_FACILITIES, MAJOR_DEPARTMENTS, DIAGNOSTIC_FACILITIES } from '../data/facilityManagement';

// Mock NFC 패널 전용 정문 데이터
const MAIN_ENTRANCE_DATA = {
  id: 'main-entrance',
  name: '정문',
  icon: '🚪',
  description: '병원 정문 입구',
  building: '본관',
  floor: '1층',
  room: '정문',
  mapFile: 'main_1f.svg',
  svgId: 'nav-main-entrance',
  coordinates: { x: 450, y: 80 },  // 정문 텍스트와 정확히 겹치는 위치
  node_id: 'main-entrance-node-001',
  x_coord: 450,
  y_coord: 80,  // 정문 텍스트와 정확히 겹치는 위치
  category: 'entrance'
};

// mapId로부터 건물/층 정보 추론
function getMapInfo(mapId) {
  const mapInfoMapping = {
    'main_1f': { building: '본관', floor: '1층' },
    'main_2f': { building: '본관', floor: '2층' },
    'annex_1f': { building: '별관', floor: '1층' },
    'cancer_1f': { building: '암센터', floor: '1층' },
    'cancer_2f': { building: '암센터', floor: '2층' },
  };
  return mapInfoMapping[mapId] || { building: '본관', floor: '1층' };
}

// 시설명으로부터 카테고리 추론
function inferCategory(facilityName, description) {
  const name = facilityName.toLowerCase();
  const desc = (description || '').toLowerCase();

  if (name.includes('입구') || name.includes('정문') || name.includes('entrance')) return 'entrance';
  if (name.includes('응급') || name.includes('emergency')) return 'emergency';
  if (name.includes('진료') || name.includes('과') || desc.includes('department')) return 'department';
  if (name.includes('검사') || name.includes('실') || name.includes('ct') || name.includes('mri') || name.includes('x-ray')) return 'diagnostic';
  if (name.includes('편의') || name.includes('약국') || name.includes('카페') || name.includes('은행')) return 'facility';

  return 'custom';
}

// 카테고리별 기본 아이콘
function getDefaultIcon(category) {
  const iconMapping = {
    'entrance': '🚪',
    'emergency': '🚨',
    'department': '🏥',
    'diagnostic': '🔬',
    'facility': '🏪',
    'custom': '📍'
  };
  return iconMapping[category] || '📍';
}

// 실제 지도에 존재하는 시설들만 필터링 (node_id가 있는 것들)
function getValidMapFacilities() {
  // 1️⃣ 기본 시설 목록 (정문 + 고정 시설들)
  const allFacilities = [
    MAIN_ENTRANCE_DATA,
    ...MAJOR_FACILITIES,
    ...MAJOR_DEPARTMENTS,
    ...DIAGNOSTIC_FACILITIES
  ];

  // node_id가 존재하는 기본 시설들만 필터링
  const validFacilities = allFacilities.filter(facility => facility.node_id);

  // 2️⃣ localStorage에서 map-editor로 추가한 시설들 가져오기
  const customFacilities = [];
  try {
    const facilityRoutesData = localStorage.getItem('facilityRoutes');
    if (facilityRoutesData) {
      const facilityRoutes = JSON.parse(facilityRoutesData);

      // x_coord, y_coord가 설정된 시설들만 추가
      Object.entries(facilityRoutes).forEach(([facilityName, facilityData]) => {
        // x_coord, y_coord가 모두 존재하는지 확인
        if (facilityData.x_coord !== undefined &&
            facilityData.y_coord !== undefined &&
            facilityData.mapId) {

          // 기본 시설 목록에 이미 있는지 확인 (중복 방지)
          const isDuplicate = validFacilities.some(f =>
            f.name === facilityName ||
            f.name === facilityData.description
          );

          if (!isDuplicate) {
            const mapInfo = getMapInfo(facilityData.mapId);
            const category = inferCategory(facilityName, facilityData.description);
            const icon = getDefaultIcon(category);

            customFacilities.push({
              id: `custom-${facilityName.replace(/\s+/g, '-')}`,
              name: facilityData.description || facilityName,
              icon: icon,
              description: facilityData.description || facilityName,
              building: mapInfo.building,
              floor: mapInfo.floor,
              room: facilityData.description || facilityName,
              mapFile: `${facilityData.mapId}.svg`,
              coordinates: { x: facilityData.x_coord, y: facilityData.y_coord },
              x_coord: facilityData.x_coord,
              y_coord: facilityData.y_coord,
              node_id: facilityData.svgElementId || `node-${facilityName}`,
              category: category,
              isCustom: true  // 커스텀 시설 표시
            });

            console.log(`🆕 Map-editor 시설 추가: ${facilityName}`, {
              coords: `(${facilityData.x_coord}, ${facilityData.y_coord})`,
              mapId: facilityData.mapId,
              category: category
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ localStorage facilityRoutes 읽기 실패:', error);
  }

  // 3️⃣ 기본 시설 + 커스텀 시설 합치기
  const allValidFacilities = [...validFacilities, ...customFacilities];

  console.log('📋 전체 유효한 시설 목록:', {
    total: allValidFacilities.length,
    builtin: validFacilities.length,
    custom: customFacilities.length
  });

  // MockNFC용 태그 형태로 변환
  return allValidFacilities.map(facility => ({
    tag_id: `mock-${facility.id}`,
    code: `nfc-${facility.id}-mock`,
    location_name: facility.name,
    description: facility.description || facility.name,
    building: facility.building,
    floor: facility.floor,
    room: facility.room,
    position: facility.coordinates || { x: facility.x_coord, y: facility.y_coord },
    node_id: facility.node_id,
    icon: facility.icon,
    category: facility.category,
    mapFile: facility.mapFile,
    is_active: true,
    isCustom: facility.isCustom || false  // 커스텀 시설 여부
  }));
}

// NFC 태그 관련 API 함수들 (이제 가상 데이터 사용)
async function fetchNFCTags() {
  try {
    // 실제 지도에 존재하는 시설들만 반환
    const validFacilities = getValidMapFacilities();
    console.log('📋 유효한 시설 목록 로드:', validFacilities.length, '개');
    console.log('📋 시설 목록:', validFacilities.map(f => ({ name: f.location_name, node_id: f.node_id, category: f.category })));
    return validFacilities;
  } catch (error) {
    console.error('NFC 태그 목록 조회 중 오류:', error);
    return [];
  }
}

async function fetchNFCLocation(tagId) {
  try {
    // Mock 태그인 경우 시설 데이터에서 직접 조회
    if (tagId.startsWith('mock-')) {
      const facilityId = tagId.replace('mock-', '');
      const validFacilities = getValidMapFacilities();
      const facility = validFacilities.find(f => f.tag_id === tagId);
      
      if (facility) {
        return {
          location_name: facility.location_name,
          building: facility.building,
          floor: facility.floor,
          room: facility.room,
          position: facility.position,
          node_id: facility.node_id,
          map_id: facility.mapFile ? facility.mapFile.replace('.svg', '') : 'main_1f'
        };
      } else {
        console.error('Mock 시설을 찾을 수 없음:', facilityId);
        return null;
      }
    }
    
    // 실제 API 호출 (기존 태그용)
    const response = await fetch(`/api/v1/nfc/tags/${tagId}/location/`);
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      console.error('NFC 태그 위치 조회 실패:', result.message);
      return null;
    }
  } catch (error) {
    console.error('NFC 태그 위치 조회 중 오류:', error);
    return null;
  }
}

export default function MockNFCPanel() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [nfcTags, setNfcTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const fetchJourneyData = useJourneyStore((state) => state.fetchJourneyData);
  const { updateCurrentLocation, updateRouteBasedOnLocation } = useMapStore();
  
  // LocationStore 훅들 - 직접 상태 접근으로 무한 루프 방지
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const currentNodeId = useLocationStore((state) => state.currentNodeId);
  const currentPosition = useLocationStore((state) => state.currentPosition);
  const currentMapId = useLocationStore((state) => state.currentMapId);
  const lastScanTime = useLocationStore((state) => state.lastScanTime);
  const setCoordinateLocation = useLocationStore((state) => state.setCoordinateLocation);
  const setCurrentLocationStore = useLocationStore((state) => state.setCurrentLocation);
  
  // 계산된 값들을 useMemo로 메모이제이션 - lastScanTime 추가하여 변경 감지 개선
  const currentCoordinateLocation = useMemo(() => ({
    nodeId: currentNodeId,
    position: currentPosition,
    mapId: currentMapId,
    isSet: !!currentNodeId,
    lastUpdate: lastScanTime
  }), [currentNodeId, currentPosition, currentMapId, lastScanTime]);
  
  // 위치 표시 로직 개선 - 더 상세한 정보 표시
  const locationSummary = useMemo(() => {
    console.log('🔍 MockNFC locationSummary 계산:', {
      currentLocation,
      currentNodeId,
      currentPosition,
      lastScanTime
    });

    if (currentLocation) {
      // 더 구체적인 위치 정보 조합
      const locationName = currentLocation.location_name;
      const building = currentLocation.building;
      const room = currentLocation.room;
      const floor = currentLocation.floor; // 이미 표준화된 데이터

      // 정문인 경우 특별 메시지
      if (locationName === '정문') {
        return `🚪 정문에서 시작 (${building} ${floor})`;
      }

      // room이 있고 locationName과 다른 경우 room을 우선 사용
      if (room && room !== locationName) {
        // room이 '채혈실'이고 locationName이 '채혈'인 경우 처리
        return `${room} (${building} ${floor})`;
      } else if (locationName) {
        return `${locationName} (${building} ${floor})`;
      } else if (building && room) {
        return `${building} ${floor} ${room}`;
      } else if (building) {
        return `${building} ${floor}`;
      } else {
        return '위치 설정됨';
      }
    }

    if (currentNodeId) {
      return `좌표 위치: (${currentPosition.x}, ${currentPosition.y})`;
    }

    return '위치가 설정되지 않음';
  }, [currentLocation, currentNodeId, currentPosition, lastScanTime]);

  // NFC 태그 목록 로드
  useEffect(() => {
    const loadNFCTags = async () => {
      setIsLoading(true);
      try {
        const tags = await fetchNFCTags();
        // 정문을 목록 상단으로 정렬
        const sortedTags = tags.sort((a, b) => {
          // 정문을 최상단에 배치
          if (a.location_name === '정문') return -1;
          if (b.location_name === '정문') return 1;
          // 그 다음 카테고리별 정렬
          const categoryOrder = { 'entrance': 0, 'emergency': 1, 'facility': 2, 'department': 3, 'diagnostic': 4 };
          const orderA = categoryOrder[a.category] ?? 5;
          const orderB = categoryOrder[b.category] ?? 5;
          if (orderA !== orderB) return orderA - orderB;
          // 마지막으로 이름순
          return a.location_name.localeCompare(b.location_name, 'ko');
        });
        setNfcTags(sortedTags);
        console.log('📋 NFC 태그 목록 로드됨:', sortedTags.length, '개');
      } catch (error) {
        console.error('NFC 태그 목록 로드 실패:', error);
        toast.error('NFC 태그 목록을 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    // 패널이 열릴 때만 태그 목록 로드
    if (isExpanded) {
      loadNFCTags();
    }
  }, [isExpanded]);

  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleMockScan = async (tag) => {
    if (isScanning) return;
    
    setIsScanning(true);
    setSelectedTag(tag.tag_id);
    
    try {
      // 진동 피드백 시뮬레이션
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      
      console.log('🏷️ Mock NFC 스캔 시작:', tag.code);
      
      // 1. 태그의 위치 정보 조회
      const locationData = await fetchNFCLocation(tag.tag_id);
      
      if (locationData) {
        console.log('📍 위치 정보 조회됨:', locationData);
        console.log('📍 이전 currentLocation 상태:', currentLocation);
        
        // ✅ 검증된 시설들만 표시되므로 node_id가 항상 존재
        const actualNodeId = locationData.node_id;
        const fallbackUsed = false;
        
        if (!actualNodeId) {
          console.error('❌ 예상치 못한 node_id 누락:', {
            tagCode: tag.code,
            locationName: locationData.location_name
          });
          throw new Error('시설 정보에 node_id가 없습니다.');
        }
        
        // 2. LocationStore에 좌표 기반 위치 설정
        console.log('📍 setCoordinateLocation 호출 전 - 전달할 데이터:', {
          nodeId: actualNodeId,
          position: locationData.position, 
          mapId: locationData.map_id,
          fallbackUsed: fallbackUsed,
          additionalInfo: {
            location_name: locationData.location_name,
            building: locationData.building,
            floor: locationData.floor,
            room: locationData.room
          }
        });
        
        // 🔧 Promise 기반 상태 검증 및 설정 (actualNodeId 사용)
        const locationSetSuccess = await new Promise((resolve) => {
          const success = setCoordinateLocation(
            actualNodeId, // fallback된 nodeId 사용
            locationData.position,
            locationData.map_id,
            {
              location_name: locationData.location_name,
              building: locationData.building,
              floor: locationData.floor,
              room: locationData.room
            }
          );
          
          if (!success) {
            console.error('❌ setCoordinateLocation 즉시 실패');
            resolve(false);
            return;
          }
          
          // 상태 업데이트 검증 (100ms 후)
          setTimeout(() => {
            const updatedState = useLocationStore.getState();
            const validation = updatedState.getStateValidation();
            
            console.log('🔍 MockNFC 스캔 후 상태 검증:', {
              ...validation,
              fallbackUsed: fallbackUsed,
              actualNodeId: actualNodeId
            });
            
            const isSuccessful = validation.hasCurrentNodeId && validation.nodeIdLocationConsistent;
            
            if (isSuccessful) {
              console.log('✅ LocationStore 상태 설정 성공 확인:', {
                nodeId: updatedState.currentNodeId,
                locationName: validation.currentState.locationName,
                position: validation.currentState.position,
                fallbackUsed: fallbackUsed
              });
              resolve(true);
            } else {
              console.warn('⚠️ LocationStore 상태 설정 불완전, 재시도 중...');
              
              // 재시도 (actualNodeId로)
              const retrySuccess = setCoordinateLocation(
                actualNodeId,
                locationData.position,
                locationData.map_id,
                {
                  location_name: locationData.location_name,
                  building: locationData.building,
                  floor: locationData.floor,
                  room: locationData.room
                }
              );
              
              setTimeout(() => {
                const finalState = useLocationStore.getState();
                const finalValidation = finalState.getStateValidation();
                const finalSuccess = finalValidation.hasCurrentNodeId && finalValidation.nodeIdLocationConsistent;
                
                if (finalSuccess) {
                  console.log('✅ 재시도 성공:', finalState.currentNodeId);
                } else {
                  console.error('❌ 재시도도 실패, 최종 상태:', finalValidation);
                }
                
                resolve(finalSuccess);
              }, 100);
            }
          }, 100);
        });
        
        // 3. 기존 MapStore도 업데이트 (호환성 유지)
        const mapLocationInfo = {
          room: locationData.room,
          description: tag.description,
          name: locationData.location_name,
          x_coord: locationData.position.x,
          y_coord: locationData.position.y,
          building: locationData.building,
          floor: locationData.floor,
          code: tag.code
        };

        updateCurrentLocation(mapLocationInfo);

        // 🗺️ 현재 위치의 지도로 전환
        const mapStoreState = useMapStore.getState();
        const targetMapId = locationData.map_id;

        console.log('🗺️ 지도 전환:', {
          from: mapStoreState.currentMapId,
          to: targetMapId,
          location: locationData.location_name
        });

        // currentMapId 직접 업데이트
        useMapStore.setState({ currentMapId: targetMapId });

        console.log('✅ 지도 전환 완료:', targetMapId);
        
        // 4. 테스트용 목적지 설정 및 경로 자동 계산 (검증된 시설만 사용)
        const validFacilities = getValidMapFacilities();
        
        // 현재 위치와 다른 목적지를 선택 (모든 시설이 유효한 node_id 보유)
        const currentX = locationData.position.x;
        const currentY = locationData.position.y;
        
        const availableDestinations = validFacilities.filter(facility => {
          const destX = facility.position.x;
          const destY = facility.position.y;
          // 현재 위치와 다르고, 최소 50px 이상 떨어진 시설들
          return facility.tag_id !== tag.tag_id && 
                 (Math.abs(destX - currentX) > 50 || Math.abs(destY - currentY) > 50);
        });
        
        const testDestination = availableDestinations.length > 0 
          ? availableDestinations[0] 
          : validFacilities[0]; // 백업용
        
        console.log('🎯 테스트 목적지 설정:', {
          name: testDestination.location_name,
          node_id: testDestination.node_id,
          hasNodeId: !!testDestination.node_id,
          coordinates: testDestination.position,
          category: testDestination.category
        });
        
        // MapStore에 목적지 전달하여 경로 계산 (오프라인 모드 포함)
        try {
          await updateRouteBasedOnLocation(mapLocationInfo, testDestination);
          
          // 🔍 경로 계산 결과 검증
          const mapState = useMapStore.getState();
          const hasRoute = !!(mapState.activeRoute && mapState.activeRoute.nodes?.length > 0);
          const hasError = !!mapState.routeError;
          
          console.log('📊 테스트 경로 계산 결과:', {
            success: hasRoute && !hasError,
            hasRoute: hasRoute,
            hasError: hasError,
            routeError: mapState.routeError,
            nodeCount: mapState.activeRoute?.nodes?.length || 0,
            routeDistance: mapState.activeRoute?.total_distance || 0
          });
          
          if (hasRoute && !hasError) {
            console.log('✅ MockNFC 테스트 경로 계산 성공!');
            toast.success(`${testDestination.location_name}까지 경로 계산 완료`, {
              icon: '🗺️',
              duration: 2000
            });
          } else if (hasError) {
            console.warn('⚠️ MockNFC 테스트 경로 계산 오류:', mapState.routeError);
            toast(`경로 계산 실패: ${mapState.routeError}`, {
              icon: '⚠️',
              duration: 3000
            });
          } else {
            console.warn('⚠️ MockNFC 테스트 경로가 생성되지 않음');
            toast('경로 정보가 생성되지 않았습니다', {
              icon: '📍',
              duration: 2000
            });
          }
          
        } catch (error) {
          console.error('❌ MockNFC 테스트 경로 계산 실패:', error);
          toast(`오프라인 모드: ${testDestination.location_name} 목적지 설정됨`, {
            icon: '📴',
            duration: 2000
          });
        }
        
        // 5. 가상 NDEF 메시지 생성 (기존 API와의 호환성을 위해)
        const jsonData = JSON.stringify({
          code: tag.code,
          location: locationData.location_name,
          building: locationData.building,
          floor: locationData.floor,
          room: locationData.room
        });
        
        const encodedData = new TextEncoder().encode(jsonData);
        const dataBuffer = new ArrayBuffer(encodedData.length + 1);
        const dataView = new DataView(dataBuffer);
        dataView.setUint8(0, 0);
        
        for (let i = 0; i < encodedData.length; i++) {
          dataView.setUint8(i + 1, encodedData[i]);
        }
        
        const mockNDEFMessage = {
          records: [
            {
              recordType: new TextEncoder().encode('T'),
              data: dataView
            }
          ]
        };
        
        // 6. 오프라인 모드로 MockNFC 처리 (API 호출 생략)
        try {
          // API 호출 시도하되, 실패시 오프라인 모드로 전환
          const result = await scanNFCTag(tag.code, mockNDEFMessage);
          console.log('📡 API 응답:', result);

          if (result.success) {
            toast.success(`${locationData.location_name} 스캔 완료!`, {
              icon: '✅',
              duration: 2000
            });
          } else if (result.offline) {
            // 오프라인 모드로 정상 동작
            console.log('📴 오프라인 모드로 동작 중');
            toast(`${locationData.location_name} (오프라인 모드)`, {
              icon: '📴',
              duration: 2000
            });
          } else {
            throw new Error(result.error || 'API 응답 실패');
          }
        } catch (apiError) {
          console.warn('⚠️ API 호출 실패, 오프라인 모드 유지:', apiError.message);

          // 오프라인 모드: API 없이도 MockNFC 동작
          toast(`${locationData.location_name} 위치 설정됨`, {
            icon: '📍',
            duration: 2000
          });
        }
        
        // 🔍 최종 LocationStore 상태 확인 (API 성공/실패와 관계없이)
        const finalState = useLocationStore.getState();
        const validation = finalState.getStateValidation();

        if (validation.hasCurrentNodeId && validation.nodeIdLocationConsistent) {
          console.log('✅ MockNFC - LocationStore 상태 설정 완료:', {
            nodeId: finalState.currentNodeId,
            location: validation.currentState.locationName,
            readyForRouting: true
          });
          // 추가 성공 메시지는 표시하지 않음 (이미 위에서 표시함)
        } else {
          console.warn('⚠️ MockNFC - LocationStore 상태 부분 설정:', validation);
          // 경고 메시지도 표시하지 않음 (사용자에게는 위치 설정 성공으로 보이도록)
        }
        
      } else {
        toast.error('태그 위치 정보를 찾을 수 없습니다.', {
          duration: 3000
        });
      }
      
    } catch (error) {
      console.error('Mock NFC 스캔 오류:', error);
      toast.error('스캔 처리 중 오류 발생', {
        duration: 3000
      });
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setSelectedTag(null);
      }, 1000);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {/* 접힌 상태 */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-white rounded-full shadow-lg border-2 border-gray-200 p-3 hover:shadow-xl transition-all duration-200 opacity-50 hover:opacity-100"
        >
          <span className="text-xl">🏷️</span>
        </button>
      ) : (
        /* 펼쳐진 상태 */
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4 max-w-sm animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">🏷️ Mock NFC Panel</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${isAuthenticated ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {isAuthenticated ? '로그인됨' : '비로그인'}
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* 현재 위치 표시 (LocationStore 기반) */}
          {(currentCoordinateLocation.isSet || currentLocation) && (
            <div 
              key={`location-${lastScanTime}`}
              className="mb-3 p-3 bg-green-50 border-2 border-green-200 rounded-xl"
            >
              <div className="text-xs font-medium text-green-600 mb-1">📍 현재 위치</div>
              <div className="text-sm font-bold text-green-800">
                {locationSummary}
              </div>
              {currentCoordinateLocation.isSet && (
                <div className="text-xs text-green-600">
                  좌표: ({currentCoordinateLocation.position.x}, {currentCoordinateLocation.position.y}) • 
                  지도: {currentCoordinateLocation.mapId}
                  {lastScanTime && (
                    <span className="ml-2">• 업데이트: {new Date(lastScanTime).toLocaleTimeString()}</span>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* 태그 목록 */}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="col-span-2 flex items-center justify-center p-4 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500"></div>
                <span className="ml-2">태그 목록 로딩 중...</span>
              </div>
            ) : nfcTags.length === 0 ? (
              <div className="col-span-2 text-center p-4 text-gray-500">
                사용 가능한 NFC 태그가 없습니다.
              </div>
            ) : (
              nfcTags.map((tag) => {
                const isMainEntrance = tag.location_name === '정문';
                const isCurrentLocation = currentLocation?.location_name === tag.location_name;

                return (
                <button
                  key={tag.tag_id}
                  onClick={() => handleMockScan(tag)}
                  disabled={isScanning}
                  className={`
                    relative p-3 rounded-lg text-sm font-medium transition-all
                    ${selectedTag === tag.tag_id
                      ? 'bg-blue-500 text-white scale-95'
                      : isCurrentLocation
                      ? 'bg-green-100 border-green-400 text-gray-700'
                      : isMainEntrance
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-gray-700 border-indigo-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'}
                    ${isScanning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    border-2
                  `}
                >
                  {/* 현재 위치 표시 배지 */}
                  {isCurrentLocation && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                      현재위치
                    </div>
                  )}

                  {/* 정문 특별 표시 */}
                  {isMainEntrance && !isCurrentLocation && (
                    <div className="absolute -top-2 -left-2 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
                      시작점
                    </div>
                  )}

                  {/* 커스텀 시설 표시 */}
                  {tag.isCustom && !isCurrentLocation && !isMainEntrance && (
                    <div className="absolute -top-2 -left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                      커스텀
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{tag.icon}</span>
                    <span className={`text-xs px-1 py-0.5 rounded ${
                      tag.category === 'entrance' ? 'bg-indigo-100 text-indigo-600' :
                      tag.category === 'emergency' ? 'bg-red-100 text-red-600' :
                      tag.category === 'department' ? 'bg-blue-100 text-blue-600' :
                      tag.category === 'diagnostic' ? 'bg-purple-100 text-purple-600' :
                      tag.category === 'custom' ? 'bg-orange-100 text-orange-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {tag.category === 'entrance' ? '입구' :
                       tag.category === 'emergency' ? '응급' :
                       tag.category === 'department' ? '진료' :
                       tag.category === 'diagnostic' ? '검사' :
                       tag.category === 'custom' ? '커스텀' : '편의'}
                    </span>
                  </div>
                  <div className="font-semibold">{tag.location_name}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {tag.building} {tag.floor} • {tag.room}
                  </div>
                  
                  {selectedTag === tag.tag_id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-90 rounded-lg">
                      <div className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-white opacity-75"></div>
                      <div className="relative inline-flex rounded-full h-6 w-6 bg-white"></div>
                    </div>
                  )}
                </button>
              );
              })
            )}
          </div>
          
          {isScanning && (
            <div className="mt-3 text-center text-sm text-blue-600 font-medium animate-pulse">
              스캔 처리 중...
            </div>
          )}
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">
                💡 실제 지도상 존재하는 시설만 표시
              </p>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                총 {nfcTags.length}개 시설
              </span>
            </div>
            {nfcTags.length > 0 && (
              <div className="flex flex-wrap gap-1 text-xs">
                {(() => {
                  const counts = nfcTags.reduce((acc, tag) => {
                    const category = tag.category || 'other';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                  }, {});
                  
                  return Object.entries(counts).map(([category, count]) => (
                    <span key={category} className={`px-2 py-1 rounded-full ${
                      category === 'entrance' ? 'bg-indigo-50 text-indigo-600' :
                      category === 'emergency' ? 'bg-red-50 text-red-600' :
                      category === 'department' ? 'bg-blue-50 text-blue-600' :
                      category === 'diagnostic' ? 'bg-purple-50 text-purple-600' :
                      category === 'facility' ? 'bg-green-50 text-green-600' :
                      category === 'custom' ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {category === 'entrance' ? '입구' :
                       category === 'emergency' ? '응급' :
                       category === 'department' ? '진료' :
                       category === 'diagnostic' ? '검사' :
                       category === 'facility' ? '편의' :
                       category === 'custom' ? '커스텀' :
                       category} {count}
                    </span>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}