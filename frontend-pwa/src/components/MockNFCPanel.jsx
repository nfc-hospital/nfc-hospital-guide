import { useState } from 'react';
import { scanNFCTag } from '../api/nfc';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// DB에 있는 실제 태그 데이터 사용
// 주의: uid 필드는 tag_uid 값이 아니라 tag_id 값임
// 백엔드에서는 code로 검색하도록 수정
const realTags = [
  { code: 'nfc-lobby-001', uid: 'nfc-lobby-001', name: '로비', building: '본관', floor: '1', room: '로비' },
  { code: 'nfc-reception-001', uid: 'nfc-reception-001', name: '접수', building: '본관', floor: '1', room: '원무과' },
  { code: 'nfc-payment-001', uid: 'nfc-payment-001', name: '수납', building: '본관', floor: '1', room: '수납창구' },
  { code: 'nfc-xray-001', uid: 'nfc-xray-001', name: 'X선실', building: '본관', floor: '2', room: 'X-ray실' },
  { code: 'nfc-blood-test-001', uid: 'nfc-blood-test-001', name: '채혈실', building: '본관', floor: '2', room: '채혈실' },
  { code: 'nfc-ct-001', uid: 'nfc-ct-001', name: 'CT실', building: '본관', floor: '3', room: 'CT실' },
  { code: 'nfc-mri-001', uid: 'nfc-mri-001', name: 'MRI실', building: '본관', floor: '3', room: 'MRI실' },
  { code: 'nfc-cardio-001', uid: 'nfc-cardio-001', name: '심전도실', building: '본관', floor: '2', room: '심전도실' },
  { code: 'nfc-ultrasound-001', uid: 'nfc-ultrasound-001', name: '초음파실', building: '본관', floor: '3', room: '초음파실' },
  { code: 'nfc-waiting-area-001', uid: 'nfc-waiting-area-001', name: '대기실', building: '본관', floor: '2', room: '중앙대기실' }
];

export default function MockNFCPanel() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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
      
      console.log('🏷️ Mock NFC 스캔:', tag.uid, mockNDEFMessage);
      
      // 실제 API 호출
      const result = await scanNFCTag(tag.uid, mockNDEFMessage);
      
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
    <div className="fixed bottom-20 right-4 z-50 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-800">🏷️ Mock NFC Panel</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${isAuthenticated ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {isAuthenticated ? '로그인됨' : '비로그인'}
        </span>
      </div>
      
      <p className="text-xs text-gray-500 mb-3">개발용 가상 NFC 태그 스캐너</p>
      
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
  );
}