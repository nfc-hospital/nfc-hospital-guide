import { useState } from 'react';
import { scanNFCTag } from '../api/nfc';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useJourneyStore from '../store/journeyStore';
import useMapStore from '../store/mapStore';

// 정확한 좌표를 포함한 실제 태그 데이터
const realTags = [
  { 
    code: 'nfc-lobby-001', 
    uid: 'nfc-lobby-001', 
    name: '로비', 
    building: '본관', 
    floor: 1, 
    room: '로비',
    x_coord: 100, 
    y_coord: 400,
    description: '병원 정문 로비'
  },
  { 
    code: 'nfc-reception-001', 
    uid: 'nfc-reception-001', 
    name: '접수', 
    building: '본관', 
    floor: 1, 
    room: '원무과',
    x_coord: 300, 
    y_coord: 300,
    description: '1층 원무과 접수 창구'
  },
  { 
    code: 'nfc-payment-001', 
    uid: 'nfc-payment-001', 
    name: '수납', 
    building: '본관', 
    floor: 1, 
    room: '수납창구',
    x_coord: 750, 
    y_coord: 375,
    description: '1층 수납 창구'
  },
  { 
    code: 'nfc-lab-a-001', 
    uid: 'nfc-lab-a-001', 
    name: '검사실 A', 
    building: '본관', 
    floor: 1, 
    room: '검사실 A',
    x_coord: 250, 
    y_coord: 375,
    description: '1층 검사실 A (혈액검사, 소변검사)'
  },
  { 
    code: 'nfc-exam-room-001', 
    uid: 'nfc-exam-room-001', 
    name: '진료실', 
    building: '본관', 
    floor: 1, 
    room: '진료실',
    x_coord: 500, 
    y_coord: 375,
    description: '1층 진료실 (일반진료, 상담)'
  },
  { 
    code: 'nfc-pharmacy-001', 
    uid: 'nfc-pharmacy-001', 
    name: '약국', 
    building: '본관', 
    floor: 1, 
    room: '약국',
    x_coord: 1000, 
    y_coord: 375,
    description: '1층 약국 (처방약 수령)'
  },
  { 
    code: 'nfc-xray-001', 
    uid: 'nfc-xray-001', 
    name: 'X선실', 
    building: '본관', 
    floor: 2, 
    room: 'X-ray실',
    x_coord: 300, 
    y_coord: 250,
    description: '2층 X선 촬영실'
  },
  { 
    code: 'nfc-blood-test-001', 
    uid: 'nfc-blood-test-001', 
    name: '채혈실', 
    building: '본관', 
    floor: 2, 
    room: '채혈실',
    x_coord: 400, 
    y_coord: 300,
    description: '2층 채혈실'
  },
  { 
    code: 'nfc-elevator-1f', 
    uid: 'nfc-elevator-1f', 
    name: '엘리베이터 (1층)', 
    building: '본관', 
    floor: 1, 
    room: '엘리베이터',
    x_coord: 540, 
    y_coord: 370,
    description: '1층 엘리베이터'
  },
  { 
    code: 'nfc-elevator-2f', 
    uid: 'nfc-elevator-2f', 
    name: '엘리베이터 (2층)', 
    building: '본관', 
    floor: 2, 
    room: '엘리베이터',
    x_coord: 540, 
    y_coord: 370,
    description: '2층 엘리베이터'
  }
];

export default function MockNFCPanel() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const fetchJourneyData = useJourneyStore((state) => state.fetchJourneyData);
  const { updateCurrentLocation, updateRouteBasedOnLocation } = useMapStore();

  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleMockScan = async (tag) => {
    if (isScanning) return;
    
    setIsScanning(true);
    setSelectedTag(tag.uid);
    
    try {
      // 진동 피드백 시뮬레이션
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      
      // 가상 NDEF 메시지 생성 (실제 NDEF API 형식에 맞게)
      const jsonData = JSON.stringify({
        code: tag.code,
        location: `${tag.building} ${tag.floor}층 ${tag.room}`,
        building: tag.building,
        floor: tag.floor,
        room: tag.room
      });
      
      // TextEncoder로 인코딩한 데이터를 DataView로 변환
      const encodedData = new TextEncoder().encode(jsonData);
      const dataBuffer = new ArrayBuffer(encodedData.length + 1);
      const dataView = new DataView(dataBuffer);
      
      // 첫 바이트는 언어 코드 길이 (0 = 언어 코드 없음)
      dataView.setUint8(0, 0);
      
      // 나머지는 JSON 데이터
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
      
      console.log('🏷️ Mock NFC 스캔:', tag.code, mockNDEFMessage);
      
      // 1. 현재 위치 설정 (mapStore에 반영)
      const locationInfo = {
        room: tag.room,
        description: tag.description,
        name: tag.name,
        x_coord: tag.x_coord,
        y_coord: tag.y_coord,
        building: tag.building,
        floor: tag.floor,
        code: tag.code
      };
      
      setCurrentLocation(locationInfo);
      updateCurrentLocation(locationInfo);
      
      console.log('📍 현재 위치 시뮬레이션:', locationInfo);
      
      // 2. 실제 API 호출 - 백엔드에서 code 필드로 검색하므로 tag.code 사용
      const result = await scanNFCTag(tag.code, mockNDEFMessage);
      
      // 3. 경로 자동 재계산 (목적지가 설정되어 있으면)
      await updateRouteBasedOnLocation(locationInfo);
      
      console.log('📡 API 응답:', result);
      
      if (result.success) {
        toast.success(`${tag.name} 태그 스캔 완료!`, {
          icon: '🏷️',
          duration: 2000
        });
        
        // 응답 데이터 처리
        const responseData = result.data;
        
        // 위치 정보 표시
        if (responseData.location_info) {
          toast(`현재 위치: ${responseData.location_info.current_location}`, {
            icon: '📍',
            duration: 3000
          });
        }
        
        // journeyStore로 전체 여정 데이터 업데이트 (태그 ID 포함)
        await fetchJourneyData(tag.code);
        
        // 검사 정보가 있으면 해당 페이지로 이동
        if (responseData.exam_info?.exam_id) {
          setTimeout(() => {
            navigate(`/exam/${responseData.exam_info.exam_id}`);
          }, 1500);
        }
        
        // 다음 행동 안내
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
          
          {/* 현재 위치 표시 */}
          {currentLocation && (
            <div className="mb-3 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="text-xs font-medium text-green-600 mb-1">📍 현재 위치</div>
              <div className="text-sm font-bold text-green-800">{currentLocation.name}</div>
              <div className="text-xs text-green-600">
                {currentLocation.building} {currentLocation.floor}층 • 좌표: ({currentLocation.x_coord}, {currentLocation.y_coord})
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {realTags.map((tag) => (
              <button
                key={tag.uid}
                onClick={() => handleMockScan(tag)}
                disabled={isScanning}
                className={`
                  relative p-3 rounded-lg text-sm font-medium transition-all
                  ${selectedTag === tag.uid 
                    ? 'bg-blue-500 text-white scale-95' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                  ${isScanning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  border border-gray-300
                `}
              >
                <div className="text-xs opacity-75">{tag.code.split('-')[1]}</div>
                <div className="font-semibold">{tag.name}</div>
                <div className="text-xs mt-1 opacity-75">
                  {tag.building} {tag.floor}F
                </div>
                
                {selectedTag === tag.uid && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-90 rounded-lg">
                    <div className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-white opacity-75"></div>
                    <div className="relative inline-flex rounded-full h-6 w-6 bg-white"></div>
                  </div>
                )}
              </button>
            ))}
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