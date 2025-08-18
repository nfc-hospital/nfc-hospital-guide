import React, { useState, useCallback, useEffect } from 'react';
import VoiceInput from './VoiceInput';
import DepartmentDirections from './maps/DepartmentDirections';
import departmentAPI from '../services/departmentAPI';

const PublicGuide = () => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 기본 아이콘 매핑 (백엔드에서 아이콘이 없는 경우 사용)
  const defaultIcons = {
    '이비인후과': '👂',
    '안과': '👁️', 
    '정형외과': '🦴',
    '내과': '🫀',
    '치과': '🦷',
    '소아과': '🧒',
    '응급의료센터': '🚨',
    '외과': '🔬',
    '진단검사의학과': '🧪',
    '원무과': '📋',
    '약국': '💊',
    '채혈실': '🩸'
  };

  // SVG ID 매핑 (overview_main_1f.svg의 실제 ID와 매칭)
  const svgIdMapping = {
    '응급의료센터': 'dept-emergency',
    '진단검사의학과': 'dept-laboratory',
    '채혈실': 'room-blood-collection',
    '영상의학과': 'dept-radiology',
    '원무과': 'dept-administration',
    '약국': 'dept-pharmacy',
    '편의점': 'store-convenience',
    '카페': 'store-cafe',
    '은행': 'store-bank',
    '내과': 'zone-internal-medicine',
    '외과': 'zone-surgery',
    '산부인과': 'zone-obstetrics',
    '소아과': 'zone-pediatrics'
  };

  // 컴포넌트 마운트 시 API에서 데이터 가져오기
  useEffect(() => {
    const fetchDepartmentData = async () => {
      try {
        setIsLoading(true);
        const groupedData = await departmentAPI.getGroupedDepartmentZones();
        
        if (groupedData.success) {
          setDepartments(groupedData.data.departments || []);
          setFacilities(groupedData.data.facilities || []);
        } else {
          setError('진료과 정보를 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('Department data fetch error:', error);
        setError('진료과 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartmentData();
  }, []);

  // 음성 입력 결과 처리
  const handleVoiceResult = useCallback((transcript) => {
    // 간단한 자연어 처리
    const text = transcript.toLowerCase();
    
    // API에서 가져온 진료과와 매칭
    const allZones = [...departments, ...facilities];
    const matchedZone = allZones.find(zone => {
      const zoneName = zone.name.toLowerCase();
      return text.includes(zoneName) || 
             (text.includes('귀') && zoneName.includes('이비인후')) ||
             (text.includes('눈') && zoneName.includes('안과')) ||
             (text.includes('뼈') && zoneName.includes('정형')) ||
             (text.includes('내과') && zoneName.includes('내과')) ||
             (text.includes('치과') && zoneName.includes('치과')) ||
             (text.includes('소아') && zoneName.includes('소아')) ||
             (text.includes('어린이') && zoneName.includes('소아')) ||
             (text.includes('응급') && zoneName.includes('응급')) ||
             (text.includes('검사') && zoneName.includes('검사')) ||
             (text.includes('약국') && zoneName.includes('약'));
    });
    
    if (matchedZone) {
      setSelectedDepartment(matchedZone);
    } else {
      setError('죄송합니다. 다시 한 번 말씀해 주시거나 아래 버튼을 눌러주세요.');
    }
  }, [departments, facilities]);

  // 에러 처리
  const handleError = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsListening(false);
  }, []);

  // 진료과 선택 초기화
  const handleReset = useCallback(() => {
    setSelectedDepartment(null);
    setError('');
  }, []);

  if (selectedDepartment) {
    return (
      <DepartmentDirections 
        department={selectedDepartment}
        onClose={handleReset}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="mobile-container min-h-screen bg-background p-6">
        <div className="max-w-lg mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-lg text-text-secondary">진료과 정보를 불러오고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary-blue rounded-2xl mx-auto flex items-center justify-center shadow-soft">
            <span className="text-4xl">🏥</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">
            무엇을 도와드릴까요?
          </h1>
          <p className="text-lg text-text-secondary">
            찾으시는 진료과를 말씀해 주세요
          </p>
        </div>

        {/* 음성 입력 */}
        <VoiceInput
          onResult={handleVoiceResult}
          onError={handleError}
          isListening={isListening}
          setIsListening={setIsListening}
        />

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-danger-red/10 text-danger-red p-4 rounded-xl">
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* 자주 찾는 진료과 */}
        {departments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary text-center">
              진료과
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {departments.slice(0, 6).map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => {
                    // 진료과 정보에 필요한 추가 정보 설정
                    const enrichedDept = {
                      ...dept,
                      map_url: dept.map_url || '/images/maps/overview_main_1f.svg',
                      svg_id: dept.svg_id || svgIdMapping[dept.name] || `dept-${dept.name.toLowerCase()}`,
                      building: dept.building || '본관',
                      floor: dept.floor || '1F'
                    };
                    console.log('Selected department:', enrichedDept);
                    setSelectedDepartment(enrichedDept);
                  }}
                  className="btn btn-secondary h-24 text-lg font-medium flex flex-col items-center justify-center p-4"
                >
                  <span className="text-3xl mb-2">
                    {dept.icon || defaultIcons[dept.name] || '🏥'}
                  </span>
                  <span className="text-center leading-tight">{dept.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 편의시설 */}
        {facilities.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary text-center">
              편의시설
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {facilities.slice(0, 4).map((facility) => (
                <button
                  key={facility.id}
                  onClick={() => {
                    // 시설 정보에 필요한 추가 정보 설정
                    const enrichedFacility = {
                      ...facility,
                      map_url: facility.map_url || '/images/maps/overview_main_1f.svg',
                      svg_id: facility.svg_id || svgIdMapping[facility.name] || `store-${facility.name.toLowerCase()}`,
                      building: facility.building || '본관',
                      floor: facility.floor || '1F'
                    };
                    console.log('Selected facility:', enrichedFacility);
                    setSelectedDepartment(enrichedFacility);
                  }}
                  className="btn btn-secondary h-24 text-lg font-medium flex flex-col items-center justify-center p-4"
                >
                  <span className="text-3xl mb-2">
                    {facility.icon || defaultIcons[facility.name] || '🏢'}
                  </span>
                  <span className="text-center leading-tight">{facility.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 안내데스크 안내 */}
        <div className="text-center space-y-2">
          <p className="text-text-secondary">
            원하시는 진료과가 없으신가요?
          </p>
          <button 
            className="text-primary-blue font-semibold text-lg hover:underline"
            onClick={() => {
              // 안내데스크 정보 찾기
              const infoDesk = [...departments, ...facilities].find(item => 
                item.name.includes('원무과') || item.name.includes('안내')
              );
              if (infoDesk) {
                setSelectedDepartment(infoDesk);
              } else {
                // 기본 안내데스크 정보 생성
                setSelectedDepartment({
                  id: 'info-desk',
                  name: '안내데스크',
                  building: '본관',
                  floor: '1F',
                  map_url: '/images/maps/overview_main_1f.svg',
                  svg_id: 'zone-administration',
                  zone_type: 'FACILITY',
                  icon: '💁'
                });
              }
            }}
          >
            <span className="text-2xl mr-2">💁</span>
            안내데스크로 가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicGuide; 