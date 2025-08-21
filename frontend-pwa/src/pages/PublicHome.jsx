import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceInput from '../components/VoiceInput';
import DepartmentDirections from '../components/DepartmentDirections';
import MapNavigator from '../components/MapNavigator'; // 경로 표시를 위해 MapNavigator 사용
import AppHeader from '../components/common/AppHeader';
import { useAuth } from '../context/AuthContext';
import { 
  MapPinIcon,
  MapIcon,
  BuildingOfficeIcon,
  BeakerIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { 
  ChevronRightIcon,
  UserCircleIcon 
} from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
// 시설 관리 데이터 import
import { 
  DEFAULT_DISPLAY_FACILITIES, 
  DEFAULT_DISPLAY_DEPARTMENTS,
  DEFAULT_DISPLAY_DIAGNOSTICS,
  getFacilityByName
} from '../data/facilityManagement';

export default function PublicHome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null); // 선택된 시설 상태 추가
  
  // facilityManagement.js에서 가져온 실제 부서들 사용
  const commonDepartments = DEFAULT_DISPLAY_DEPARTMENTS;
  const diagnosticFacilities = DEFAULT_DISPLAY_DIAGNOSTICS;

  // 음성 입력 결과 처리
  const handleVoiceResult = useCallback((transcript) => {
    console.log('음성 인식 결과:', transcript);
    const text = transcript.toLowerCase();
    
    // 더 많은 키워드 매칭 추가
    let matched = false;
    
    // 응급 관련
    if (text.includes('응급')) {
      const emergency = DEFAULT_DISPLAY_FACILITIES.find(f => f.name === '응급실');
      if (emergency) {
        setSelectedFacility(emergency);
        matched = true;
      }
    }
    // 약국 관련
    else if (text.includes('약')) {
      const pharmacy = DEFAULT_DISPLAY_FACILITIES.find(f => f.name === '약국');
      if (pharmacy) {
        setSelectedFacility(pharmacy);
        matched = true;
      }
    }
    // 원무과 관련
    else if (text.includes('원무') || text.includes('접수') || text.includes('수납')) {
      const admin = DEFAULT_DISPLAY_FACILITIES.find(f => f.name === '원무과');
      if (admin) {
        setSelectedFacility(admin);
        matched = true;
      }
    }
    // 내과 관련
    else if (text.includes('내과') || text.includes('감기') || text.includes('몸살')) {
      const internal = DEFAULT_DISPLAY_DEPARTMENTS.find(d => d.name === '내과');
      if (internal) {
        setSelectedFacility(internal);
        matched = true;
      }
    }
    // 정형외과 관련
    else if (text.includes('정형') || text.includes('뼈') || text.includes('골절') || text.includes('관절')) {
      const orthopedics = DEFAULT_DISPLAY_DEPARTMENTS.find(d => d.name === '정형외과');
      if (orthopedics) {
        setSelectedFacility(orthopedics);
        matched = true;
      }
    }
    // 재활의학과 관련
    else if (text.includes('재활') || text.includes('물리치료')) {
      const rehab = DEFAULT_DISPLAY_DEPARTMENTS.find(d => d.name === '재활의학과');
      if (rehab) {
        setSelectedFacility(rehab);
        matched = true;
      }
    }
    // 영상의학과 관련
    else if (text.includes('영상') || text.includes('엑스레이') || text.includes('x-ray') || text.includes('xray')) {
      const radiology = DEFAULT_DISPLAY_DEPARTMENTS.find(d => d.name === '영상의학과');
      if (radiology) {
        setSelectedFacility(radiology);
        matched = true;
      }
    }
    // CT 관련
    else if (text.includes('ct') || text.includes('씨티')) {
      const ct = DEFAULT_DISPLAY_DIAGNOSTICS.find(d => d.name === 'CT실');
      if (ct) {
        setSelectedFacility(ct);
        matched = true;
      }
    }
    // MRI 관련
    else if (text.includes('mri') || text.includes('엠알아이')) {
      const mri = DEFAULT_DISPLAY_DIAGNOSTICS.find(d => d.name === 'MRI실');
      if (mri) {
        setSelectedFacility(mri);
        matched = true;
      }
    }
    // 채혈 관련
    else if (text.includes('채혈') || text.includes('피검사') || text.includes('혈액')) {
      const blood = DEFAULT_DISPLAY_DIAGNOSTICS.find(d => d.name === '채혈실');
      if (blood) {
        setSelectedFacility(blood);
        matched = true;
      }
    }
    // 초음파 관련
    else if (text.includes('초음파')) {
      const ultrasound = DEFAULT_DISPLAY_DIAGNOSTICS.find(d => d.name === '초음파실');
      if (ultrasound) {
        setSelectedFacility(ultrasound);
        matched = true;
      }
    }
    // 진단검사 관련
    else if (text.includes('검사') || text.includes('진단')) {
      const lab = DEFAULT_DISPLAY_DIAGNOSTICS.find(d => d.name === '진단검사의학과');
      if (lab) {
        setSelectedFacility(lab);
        matched = true;
      }
    }
    // 귀, 코, 목 관련 - 이비인후과로 안내
    else if (text.includes('귀') || text.includes('코') || text.includes('목') || text.includes('이비인후')) {
      const ent = DEFAULT_DISPLAY_DEPARTMENTS.find(d => d.name === '이비인후과');
      if (ent) {
        setSelectedFacility(ent);
        matched = true;
      }
    }
    // 눈 관련 (안과는 없으므로 내과로 안내)
    else if (text.includes('눈') || text.includes('안과') || text.includes('시력')) {
      const internal = DEFAULT_DISPLAY_DEPARTMENTS.find(d => d.name === '내과');
      if (internal) {
        setSelectedFacility(internal);
        setError('안과는 현재 없습니다. 내과로 안내해드립니다.');
        matched = true;
      }
    }
    
    if (!matched) {
      setError('죄송합니다. 다시 한 번 말씀해 주시거나 아래 버튼을 눌러주세요.');
    }
  }, []);

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


  if (selectedDepartment) {
    return (
      <DepartmentDirections 
        department={selectedDepartment}
        onClose={handleReset}
      />
    );
  }

  if (selectedFacility) {
    // 응급실이나 다른 주요 시설인 경우 MapNavigator로 경로 표시
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16 sm:h-20">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg sm:text-xl font-bold">H</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">HC_119</h1>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">NFC + AI 기반 병원 내 검사·진료 안내 시스템</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-blue-600 hover:underline font-semibold"
              >
                <span className="text-xl">←</span>
                <span>뒤로가기</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">{selectedFacility.icon}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedFacility.name}</h1>
              <p className="text-lg text-gray-600 mb-4">{selectedFacility.description}</p>
              <div className="flex justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <span>🏢</span>
                  <span>{selectedFacility.building}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📍</span>
                  <span>{selectedFacility.floor}</span>
                </div>
                {selectedFacility.room && (
                  <div className="flex items-center gap-1">
                    <span>🚪</span>
                    <span>{selectedFacility.room}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapIcon className="w-6 h-6 text-blue-600" />
                <span>위치 안내</span>
              </h2>
            </div>
            <div className="p-4">
              <MapNavigator 
                mapId={selectedFacility.mapFile?.replace('.svg', '') || 'main_1f'}
                highlightRoom={selectedFacility.name}
                facilityName={selectedFacility.name}
              />
            </div>
          </div>

        </main>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 상단 헤더 - AppHeader 컴포넌트 사용 */}
      <AppHeader />

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/* 환영 메시지 & 음성 안내 섹션 - 모바일 최적화 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl p-6 sm:p-12 mb-6 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">
              어디로 가시나요?
            </h2>
            
            {/* 음성 입력 - VoiceInput 컴포넌트 사용 */}
            <div className="w-full">
              <VoiceInput
                onResult={handleVoiceResult}
                onError={handleError}
                isListening={isListening}
                setIsListening={setIsListening}
              />
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-2 animate-shake">
            <span className="text-lg">⚠️</span>
            <p className="text-sm sm:text-base font-medium">{error}</p>
          </div>
        )}

        {/* 선택 안내 문구 - 간소화 */}
        <div className="text-center mt-6 mb-4">
          <p className="text-sm text-gray-600">
            또는 아래 버튼을 선택하세요 ↓
          </p>
        </div>

        {/* 주요 장소 빠른 선택 - 모바일 최적화 */}
        <section className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPinIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            주요 시설
          </h3>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {DEFAULT_DISPLAY_FACILITIES.map((place) => (
              <button
                key={place.id}
                onClick={() => handleFacilitySelect(place)}
                className={`group relative bg-white ${place.color?.border || 'border-gray-200'} border-2 rounded-2xl p-4 sm:p-6 transition-all duration-300 ${place.color?.hover || 'hover:bg-gray-100'} hover:shadow-lg`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 ${place.color?.light || 'bg-gray-50'} rounded-xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300`}>
                    {place.icon}
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900">{place.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600">{place.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 진료과 섹션 - 실제 존재하는 부서들로 수정 */}
        <section className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            주요 진료과
          </h3>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {commonDepartments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleFacilitySelect(dept)}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:bg-blue-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-2xl mb-2">{dept.icon}</div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 text-left">{dept.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 text-left">{dept.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500 text-left">{dept.building} {dept.floor}</p>
                      {dept.waitingPatients && (
                        <p className="text-xs font-medium text-blue-600">{dept.waitingPatients} 대기</p>
                      )}
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-all flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 검사·진단 섹션 - 새로 추가 */}
        <section className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BeakerIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            검사 · 진단
          </h3>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {diagnosticFacilities.map((diagnostic) => (
              <button
                key={diagnostic.id}
                onClick={() => handleFacilitySelect(diagnostic)}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:border-green-300 hover:shadow-lg hover:bg-green-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-2xl mb-2">{diagnostic.icon}</div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 text-left">{diagnostic.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 text-left">{diagnostic.description}</p>
                    <p className="text-xs text-gray-500 text-left mt-1">{diagnostic.building} {diagnostic.floor}</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-all flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 로그인 유도 카드 - 모바일 최적화 (비로그인 사용자에게만 표시) */}
        {!isAuthenticated && (
          <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-white shadow-xl">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4">
                환자 맞춤 서비스
              </h3>
              <p className="text-sm sm:text-lg text-slate-300 mb-6">
                로그인하시면 더 편리한 병원 이용이 가능합니다
              </p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-3">
                <span className="text-xl">📅</span>
                <div>
                  <h5 className="text-sm font-semibold">검사 일정</h5>
                  <p className="text-xs text-slate-300">실시간 확인</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-3">
                <span className="text-xl">🔔</span>
                <div>
                  <h5 className="text-sm font-semibold">호출 알림</h5>
                  <p className="text-xs text-slate-300">자동 알림</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-3">
                <span className="text-xl">🗺️</span>
                <div>
                  <h5 className="text-sm font-semibold">맞춤 길안내</h5>
                  <p className="text-xs text-slate-300">최적 경로</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl p-3">
                <span className="text-xl">📱</span>
                <div>
                  <h5 className="text-sm font-semibold">NFC 스캔</h5>
                  <p className="text-xs text-slate-300">자동 체크인</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/login')}
              className="w-full group bg-white text-slate-900 px-6 py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center gap-2"
            >
              지금 로그인하기
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
        )}
      </main>
    </motion.div>
  );
}