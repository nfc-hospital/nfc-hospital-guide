import { useState, useEffect, useMemo } from 'react';
import { scanNFCTag } from '../api/nfc';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useJourneyStore from '../store/journeyStore';
import useMapStore from '../store/mapStore';
import useLocationStore from '../store/locationStore';

// NFC 태그 관련 API 함수들
async function fetchNFCTags() {
  try {
    const response = await fetch('/api/v1/nfc/tags/');
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      console.error('NFC 태그 목록 조회 실패:', result.message);
      return [];
    }
  } catch (error) {
    console.error('NFC 태그 목록 조회 중 오류:', error);
    return [];
  }
}

async function fetchNFCLocation(tagId) {
  try {
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
      const floor = currentLocation.floor;
      
      if (locationName) {
        return `${locationName} (${building} ${floor}F)`;
      } else if (building && room) {
        return `${building} ${floor}F ${room}`;
      } else if (building) {
        return `${building} ${floor}F`;
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
        setNfcTags(tags);
        console.log('📋 NFC 태그 목록 로드됨:', tags.length, '개');
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
        
        // 🔧 node_id Fallback 로직 추가
        let actualNodeId = locationData.node_id;
        let fallbackUsed = false;
        
        if (!actualNodeId) {
          console.warn('⚠️ API에서 node_id가 null - Fallback 로직 시작');
          
          // facilityManagement.js에서 태그 코드 기반으로 node_id 찾기
          const { ALL_FACILITIES } = await import('../data/facilityManagement');
          
          // 태그 코드나 위치명으로 매칭 시도
          const matchedFacility = ALL_FACILITIES.find(facility => 
            tag.code.toLowerCase().includes(facility.name.toLowerCase()) ||
            facility.name.toLowerCase().includes(locationData.location_name?.toLowerCase() || '') ||
            (tag.code === 'nfc-pharmacy-1f001' && facility.id === 'pharmacy') ||
            (tag.code.includes('pharmacy') && facility.id === 'pharmacy') ||
            (tag.code.includes('emergency') && facility.id === 'emergency') ||
            (tag.code.includes('reception') && facility.id === 'administration') ||
            (tag.code.includes('info') && facility.id === 'info-desk')
          );
          
          if (matchedFacility?.node_id) {
            actualNodeId = matchedFacility.node_id;
            fallbackUsed = true;
            console.log('✅ Fallback 성공:', {
              tagCode: tag.code,
              matchedFacility: matchedFacility.name,
              fallbackNodeId: actualNodeId
            });
          } else {
            console.error('❌ Fallback 실패 - 매칭되는 시설을 찾을 수 없음:', {
              tagCode: tag.code,
              locationName: locationData.location_name
            });
          }
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
        
        // 4. 테스트용 목적지 설정 및 경로 자동 계산 (실제 node_id 사용)
        // facilityManagement.js에서 실제 시설 데이터 사용
        const { MAJOR_DEPARTMENTS, MAJOR_FACILITIES } = await import('../data/facilityManagement');
        
        const testDestinations = [
          // 내과 (실제 존재하는 시설)
          MAJOR_DEPARTMENTS.find(d => d.id === 'internal-medicine') || 
          { 
            title: '내과', 
            name: '내과',
            x_coord: 215, 
            y_coord: 290, 
            room: '내과 진료실',
            node_id: null // fallback 시 MapStore에서 처리
          },
          // 약국 (실제 존재하는 시설)  
          MAJOR_FACILITIES.find(f => f.id === 'pharmacy') || 
          {
            title: '약국',
            name: '약국', 
            x_coord: 780, 
            y_coord: 280, 
            room: '원내약국',
            node_id: '650fa82e-595b-4232-b27f-ee184b4fce14' // 약국 실제 node_id
          },
          // 안내데스크 (실제 존재하는 시설)
          MAJOR_FACILITIES.find(f => f.id === 'info-desk') ||
          {
            title: '안내데스크',
            name: '안내데스크',
            x_coord: 450, 
            y_coord: 200, 
            room: '안내데스크',
            node_id: '497071c2-a868-408c-9595-3cb597b15bae' // 안내데스크 실제 node_id
          }
        ];
        
        console.log('🎯 테스트 목적지 로드 완료:', testDestinations.map(d => ({
          name: d.name || d.title,
          node_id: d.node_id,
          hasNodeId: !!d.node_id
        })));
        
        // 현재 위치와 다른 목적지를 무작위로 선택
        const currentX = locationData.position.x;
        const currentY = locationData.position.y;
        
        const availableDestinations = testDestinations.filter(dest => {
          const destX = dest.coordinates?.x || dest.x_coord || 0;
          const destY = dest.coordinates?.y || dest.y_coord || 0;
          return Math.abs(destX - currentX) > 50 || Math.abs(destY - currentY) > 50;
        });
        
        const testDestination = availableDestinations.length > 0 
          ? availableDestinations[0] 
          : testDestinations[0];
        
        console.log('🎯 테스트 목적지 설정:', {
          name: testDestination.name || testDestination.title,
          node_id: testDestination.node_id,
          hasNodeId: !!testDestination.node_id,
          coordinates: testDestination.coordinates || { x: testDestination.x_coord, y: testDestination.y_coord }
        });
        
        // MapStore에 목적지 전달하여 경로 계산
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
          } else if (hasError) {
            console.warn('⚠️ MockNFC 테스트 경로 계산 오류:', mapState.routeError);
          } else {
            console.warn('⚠️ MockNFC 테스트 경로가 생성되지 않음');
          }
          
        } catch (error) {
          console.error('❌ MockNFC 테스트 경로 계산 실패:', error);
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
        
        // 6. 기존 scanNFCTag API 호출 (기존 여정 로직 활용)
        const result = await scanNFCTag(tag.code, mockNDEFMessage);
        
        console.log('📡 API 응답:', result);
        
        if (result.success) {
          toast.success(`${locationData.location_name} 스캔 완료!`, {
            icon: '🏷️',
            duration: 2000
          });
          
          // journeyStore 업데이트 (비로그인 사용자도 지원)
          const journeyResult = await fetchJourneyData(tag.code);
          
          // 비로그인 사용자의 경우 간단한 성공 처리
          if (journeyResult?.isGuest) {
            console.log('👤 비로그인 사용자 MockNFC 스캔 완료');
            
            // 🔍 최종 LocationStore 상태 확인
            const finalState = useLocationStore.getState();
            const validation = finalState.getStateValidation();
            
            if (validation.hasCurrentNodeId && validation.nodeIdLocationConsistent) {
              toast.success(`${tag.description} 위치 설정 완료! 🎯 경로 계산 준비됨`, {
                icon: '📍',
                duration: 3000
              });
              console.log('✅ 비로그인 사용자 - LocationStore 상태 완벽 설정:', {
                nodeId: finalState.currentNodeId,
                location: validation.currentState.locationName,
                readyForRouting: true
              });
            } else {
              toast(`${tag.description} 위치 설정됨 (부분)`, {
                icon: '⚠️',
                duration: 2000
              });
              console.warn('⚠️ 비로그인 사용자 - LocationStore 상태 부분 설정:', validation);
            }
            
            return; // 추가 네비게이션 없이 종료
          }
          
          // 응답 데이터 처리 (인증된 사용자만)
          const responseData = result.data;
          
          if (responseData.exam_info?.exam_id) {
            setTimeout(() => {
              navigate(`/exam/${responseData.exam_info.exam_id}`);
            }, 1500);
          }
          
          if (responseData.next_action?.route) {
            setTimeout(() => {
              navigate(responseData.next_action.route);
            }, 1500);
          }
        } else if (result.offline) {
          toast('오프라인 모드 - 로컬 처리만 수행', {
            icon: '📴',
            duration: 2000
          });
        } else {
          toast.error(result.error || '태그 스캔 실패', {
            duration: 3000
          });
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
          className="bg-white rounded-full shadow-lg border-2 border-gray-200 p-3 hover:shadow-xl transition-all duration-200"
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
              nfcTags.map((tag) => (
                <button
                  key={tag.tag_id}
                  onClick={() => handleMockScan(tag)}
                  disabled={isScanning}
                  className={`
                    relative p-3 rounded-lg text-sm font-medium transition-all
                    ${selectedTag === tag.tag_id 
                      ? 'bg-blue-500 text-white scale-95' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                    ${isScanning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    border border-gray-300
                  `}
                >
                  <div className="text-xs opacity-75">{tag.code}</div>
                  <div className="font-semibold">{tag.location_name}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {tag.building} {tag.floor}F
                  </div>
                  
                  {selectedTag === tag.tag_id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-90 rounded-lg">
                      <div className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-white opacity-75"></div>
                      <div className="relative inline-flex rounded-full h-6 w-6 bg-white"></div>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
          
          {isScanning && (
            <div className="mt-3 text-center text-sm text-blue-600 font-medium animate-pulse">
              스캔 처리 중...
            </div>
          )}
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              💡 실제 NFC 태그처럼 작동합니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}