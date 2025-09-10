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
  const setCoordinateLocation = useLocationStore((state) => state.setCoordinateLocation);
  const setCurrentLocationStore = useLocationStore((state) => state.setCurrentLocation);
  
  // 계산된 값들을 useMemo로 메모이제이션
  const currentCoordinateLocation = useMemo(() => ({
    nodeId: currentNodeId,
    position: currentPosition,
    mapId: currentMapId,
    isSet: !!currentNodeId
  }), [currentNodeId, currentPosition, currentMapId]);
  
  const locationSummary = useMemo(() => {
    if (currentLocation) {
      return currentLocation.location_name || 
             `${currentLocation.building} ${currentLocation.room}` ||
             '위치 설정됨';
    }
    
    if (currentNodeId) {
      return `좌표: (${currentPosition.x}, ${currentPosition.y})`;
    }
    
    return '위치가 설정되지 않음';
  }, [currentLocation, currentNodeId, currentPosition]);

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
        
        // 2. LocationStore에 좌표 기반 위치 설정
        setCoordinateLocation(
          locationData.node_id,
          locationData.position,
          locationData.map_id,
          {
            location_name: locationData.location_name,
            building: locationData.building,
            floor: locationData.floor,
            room: locationData.room
          }
        );
        
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
        
        // 4. 테스트용 목적지 설정 및 경로 자동 계산
        // 현재 위치와 다른 노드로 경로를 생성하여 시각화 테스트
        const testDestinations = [
          { title: '내과 진료실 1', x_coord: 215, y_coord: 290, room: '내과 진료실 1' },
          { title: '약국', x_coord: 530, y_coord: 320, room: '약국' },
          { title: '간호사실', x_coord: 450, y_coord: 410, room: '간호사실' }
        ];
        
        // 현재 위치와 다른 목적지를 무작위로 선택
        const currentX = locationData.position.x;
        const currentY = locationData.position.y;
        
        const availableDestinations = testDestinations.filter(dest => 
          Math.abs(dest.x_coord - currentX) > 50 || Math.abs(dest.y_coord - currentY) > 50
        );
        
        const testDestination = availableDestinations.length > 0 
          ? availableDestinations[0] 
          : testDestinations[0];
        
        console.log('🎯 테스트 목적지 설정:', testDestination);
        
        // MapStore에 목적지 전달하여 경로 계산
        await updateRouteBasedOnLocation(mapLocationInfo, testDestination);
        
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
          
          // journeyStore 업데이트
          await fetchJourneyData(tag.code);
          
          // 응답 데이터 처리
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
          toast.warning('오프라인 모드 - 로컬 처리만 수행', {
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
            <div className="mb-3 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="text-xs font-medium text-green-600 mb-1">📍 현재 위치</div>
              <div className="text-sm font-bold text-green-800">
                {locationSummary}
              </div>
              {currentCoordinateLocation.isSet && (
                <div className="text-xs text-green-600">
                  좌표: ({currentCoordinateLocation.position.x}, {currentCoordinateLocation.position.y}) • 
                  지도: {currentCoordinateLocation.mapId}
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