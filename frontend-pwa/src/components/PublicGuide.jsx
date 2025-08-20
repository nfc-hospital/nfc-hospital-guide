import React, { useState, useCallback, useEffect } from 'react';
import VoiceInput from './VoiceInput';
import DepartmentDirections from './maps/DepartmentDirections';
import departmentAPI from '../services/departmentAPI';
import AppHeader from './common/AppHeader';
// 시설 관리 데이터 import
import { 
  DEFAULT_DISPLAY_FACILITIES, 
  DEFAULT_DISPLAY_DEPARTMENTS,
  DEFAULT_DISPLAY_DIAGNOSTICS,
  getFacilityByName,
  ALL_FACILITIES 
} from '../data/facilityManagement';

const PublicGuide = () => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null); // 선택된 시설 상태 추가
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
    
    // facilityManagement.js의 데이터와 매칭 시도
    const facilityMatch = getFacilityByName(text);
    
    if (facilityMatch) {
      // 시설 데이터에서 매칭된 경우
      setSelectedFacility(facilityMatch);
    } else {
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
    setSelectedFacility(null); // 시설 선택도 초기화
    setError('');
  }, []);

  // 시설 선택 핸들러
  const handleFacilitySelect = useCallback((facility) => {
    console.log('Selected facility:', facility);
    setSelectedFacility(facility);
    setError(''); // 에러 메시지 초기화
  }, []);

  // 선택된 시설의 지도를 표시하는 컴포넌트
  const SimpleMapViewer = ({ facility, onClose }) => {
    const svgContainerRef = React.useRef(null);
    const mapSrc = `/images/maps/${facility.mapFile}`;

    React.useEffect(() => {
      const loadSvg = async () => {
        try {
          const response = await fetch(mapSrc);
          const svgText = await response.text();
          
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgElement = svgDoc.documentElement;
          
          // SVG 크기 속성 설정
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          
          // 해당 시설 강조 표시
          if (facility.svgId) {
            const targetElement = svgElement.getElementById(facility.svgId);
            if (targetElement) {
              targetElement.style.fill = '#fca5a5'; // 밝은 빨간색 배경
              targetElement.style.stroke = '#dc2626'; // 진한 빨간색 테두리
              targetElement.style.strokeWidth = '3';
              targetElement.style.filter = 'drop-shadow(0 0 8px rgba(220, 38, 38, 0.6))';
            }
          }
          
          // 현재 위치 마커 추가 (정문)
          const markerGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
          markerGroup.setAttribute('transform', 'translate(450, 80)');
          
          // 펄스 애니메이션 원
          const pulseCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
          pulseCircle.setAttribute('r', '20');
          pulseCircle.setAttribute('fill', '#3b82f6');
          pulseCircle.setAttribute('opacity', '0.3');
          
          const animatePulse = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'animate');
          animatePulse.setAttribute('attributeName', 'r');
          animatePulse.setAttribute('from', '10');
          animatePulse.setAttribute('to', '30');
          animatePulse.setAttribute('dur', '2s');
          animatePulse.setAttribute('repeatCount', 'indefinite');
          
          const animateOpacity = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'animate');
          animateOpacity.setAttribute('attributeName', 'opacity');
          animateOpacity.setAttribute('from', '0.5');
          animateOpacity.setAttribute('to', '0');
          animateOpacity.setAttribute('dur', '2s');
          animateOpacity.setAttribute('repeatCount', 'indefinite');
          
          pulseCircle.appendChild(animatePulse);
          pulseCircle.appendChild(animateOpacity);
          
          // 메인 마커
          const mainCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
          mainCircle.setAttribute('r', '12');
          mainCircle.setAttribute('fill', '#3b82f6');
          mainCircle.setAttribute('stroke', '#ffffff');
          mainCircle.setAttribute('stroke-width', '3');
          
          // 현재 위치 텍스트
          const text = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('y', '-20');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '14');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('fill', '#3b82f6');
          text.textContent = '현재 위치';
          
          markerGroup.appendChild(pulseCircle);
          markerGroup.appendChild(mainCircle);
          markerGroup.appendChild(text);
          svgElement.appendChild(markerGroup);
          
          // 컨테이너에 SVG 삽입
          if (svgContainerRef.current) {
            svgContainerRef.current.innerHTML = '';
            svgContainerRef.current.appendChild(svgElement);
          }
        } catch (error) {
          console.error('SVG 로드 오류:', error);
        }
      };
      
      if (facility && facility.mapFile) {
        loadSvg();
      }
    }, [facility, mapSrc]);

    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mobile-container p-6">
          <div className="max-w-lg mx-auto space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-primary-blue hover:underline"
              >
                <span className="text-xl">←</span>
                <span className="font-semibold">뒤로가기</span>
              </button>
            </div>

            {/* 시설 정보 카드 */}
            <div className="bg-white rounded-2xl shadow-soft p-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">{facility.icon}</span>
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">{facility.name}</h1>
              <p className="text-text-secondary mb-4">{facility.description}</p>
              <div className="flex justify-center gap-4 text-sm text-text-secondary">
                <div className="flex items-center gap-1">
                  <span>🏢</span>
                  <span>{facility.building}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📍</span>
                  <span>{facility.floor}</span>
                </div>
                {facility.room && (
                  <div className="flex items-center gap-1">
                    <span>🚪</span>
                    <span>{facility.room}</span>
                  </div>
                )}
                {facility.waitingPatients && (
                  <div className="flex items-center gap-1">
                    <span>⏰</span>
                    <span>{facility.waitingPatients} 대기</span>
                  </div>
                )}
              </div>
            </div>

            {/* 지도 */}
            <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <span className="text-xl">🗺️</span>
                  <span>위치 안내</span>
                </h2>
              </div>
              <div className="relative w-full aspect-[3/2] bg-gray-50">
                <div ref={svgContainerRef} className="w-full h-full flex items-center justify-center" />
              </div>
            </div>

            {/* 도움말 */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 text-center">
                <span className="text-xl mr-2">💡</span>
                파란색 마커는 현재 위치, 빨간색 영역이 목적지입니다
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (selectedDepartment) {
    return (
      <DepartmentDirections 
        department={selectedDepartment}
        onClose={handleReset}
      />
    );
  }

  if (selectedFacility) {
    return (
      <SimpleMapViewer 
        facility={selectedFacility}
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
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mobile-container p-6">
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

        {/* 주요 시설 */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary text-center">
            주요 시설
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {DEFAULT_DISPLAY_FACILITIES.map((facility) => (
              <button
                key={facility.id}
                onClick={() => handleFacilitySelect(facility)}
                className={`group relative bg-white ${facility.color?.border || 'border-gray-200'} border-2 rounded-2xl p-4 transition-all duration-300 ${facility.color?.hover || 'hover:bg-gray-100'} hover:shadow-lg`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`w-14 h-14 ${facility.color?.light || 'bg-gray-50'} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                    {facility.icon}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">{facility.name}</h4>
                    <p className="text-xs text-gray-600">{facility.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 주요 진료과 */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary text-center">
            주요 진료과
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {DEFAULT_DISPLAY_DEPARTMENTS.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleFacilitySelect(dept)} // 진료과도 시설로 처리
                className="group bg-white border-2 border-gray-200 rounded-2xl p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:bg-blue-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-2xl mb-2">{dept.icon}</div>
                    <h4 className="text-base font-bold text-gray-900 text-left">{dept.name}</h4>
                    <p className="text-xs text-gray-600 text-left">{dept.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500 text-left">{dept.building} {dept.floor}</p>
                      {dept.waitingPatients && (
                        <p className="text-xs font-medium text-blue-600">{dept.waitingPatients} 대기</p>
                      )}
                    </div>
                  </div>
                  <div className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-all flex-shrink-0 mt-1">
                    <span>→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 검사 및 진단 */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary text-center">
            검사 · 진단
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {DEFAULT_DISPLAY_DIAGNOSTICS.map((diagnostic) => (
              <button
                key={diagnostic.id}
                onClick={() => handleFacilitySelect(diagnostic)}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-4 transition-all duration-300 hover:border-green-300 hover:shadow-lg hover:bg-green-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-2xl mb-2">{diagnostic.icon}</div>
                    <h4 className="text-base font-bold text-gray-900 text-left">{diagnostic.name}</h4>
                    <p className="text-xs text-gray-600 text-left">{diagnostic.description}</p>
                    <p className="text-xs text-gray-500 text-left mt-1">{diagnostic.building} {diagnostic.floor}</p>
                  </div>
                  <div className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-all flex-shrink-0 mt-1">
                    <span>→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* API에서 가져온 기존 진료과가 있는 경우에도 표시 */}
        {departments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary text-center">
              기타 진료과
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {departments.slice(0, 4).map((dept) => (
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

        {/* API에서 가져온 기존 편의시설이 있는 경우에도 표시 */}
        {facilities.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary text-center">
              기타 편의시설
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
    </div>
  );
};

export default PublicGuide; 