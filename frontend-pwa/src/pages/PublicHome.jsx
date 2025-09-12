import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceInput from '../components/VoiceInput';
import DepartmentDirections from '../components/DepartmentDirections';
import MapNavigator from '../components/MapNavigator'; // 경로 표시를 위해 MapNavigator 사용
import AppHeader from '../components/common/AppHeader';
import { useAuth } from '../context/AuthContext';
import useMapStore from '../store/mapStore'; // mapStore import
import useLocationStore from '../store/locationStore'; // locationStore import for debugging
import { 
  MapPinIcon,
  MapIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon,
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

// 무한 렌더링 방지를 위한 안정적인 상수 (컴포넌트 외부에 선언)
const EMPTY_NODES = [];
const EMPTY_EDGES = [];

export default function PublicHome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null); // 선택된 시설 상태 추가
  const [isSpeaking, setIsSpeaking] = useState(false); // 음성 재생 상태 추가
  
  // mapStore에서 필요한 상태와 함수 가져오기
  const { 
    calculateRouteToFacility, // ✅ 새로운 통합 핵심 함수
    navigateToFacility,       // 하위 호환성 유지
    activeRoute,
    navigationRoute,
    currentMapId,
    routeError,               // ✅ 새로운 경로 오류 상태
    isRouteLoading,           // ✅ 경로 계산 로딩 상태
    clearRouteError           // ✅ 오류 초기화 함수
  } = useMapStore();
  
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

  // 시설 선택 핸들러 (원래 로직 복원)
  // ✅ 최종 단순화된 시설 선택 함수 (직접 호출) - 강화된 모니터링 버전
  const handleFacilitySelect = useCallback(async (facility) => {
    console.log('🏢 시설 선택 상세 분석:', {
      id: facility.id,
      name: facility.name,
      node_id: facility.node_id,
      category: facility.category,
      전체_객체: facility
    });
    setSelectedFacility(facility);
    setError(''); // 기존 에러 메시지 초기화
    clearRouteError(); // 경로 에러 초기화
    
    // 🔍 LocationStore 상태 진단 (경로 계산 전)
    const locationState = useLocationStore.getState();
    const preValidation = locationState.getStateValidation();
    
    console.log('🔍 경로 계산 전 LocationStore 상태 진단:', {
      hasCurrentNodeId: preValidation.hasCurrentNodeId,
      hasValidPosition: preValidation.hasValidPosition,
      nodeIdLocationConsistent: preValidation.nodeIdLocationConsistent,
      isRecentScan: preValidation.isRecentScan,
      currentState: preValidation.currentState,
      timeSinceLastScan: preValidation.timeSinceLastScan
    });
    
    // ✅ node_id 사전 검증
    if (!facility.node_id) {
      console.warn('⚠️ 선택된 시설에 node_id가 없음:', facility);
      setError(`${facility.name}의 위치 정보가 설정되지 않았습니다. 관리자에게 문의해주세요.`);
      return;
    }
    
    console.log('✅ node_id 검증 통과:', {
      facilityName: facility.name,
      nodeId: facility.node_id
    });
    
    // 🚀 경로 계산 시작 타임스탬프
    const startTime = performance.now();
    console.log('⏱️ 경로 계산 시작:', new Date().toISOString());
    
    try {
      // ✅ 새로운 통합 핵심 함수 직접 호출 (최단 데이터 흐름)
      await calculateRouteToFacility(facility);
      
      // 📊 성공 후 상태 및 성능 분석
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const postValidation = useLocationStore.getState().getStateValidation();
      const mapState = useMapStore.getState();
      
      console.log('✅ 경로 계산 완료 분석:', {
        duration: `${duration.toFixed(2)}ms`,
        routeSuccess: !!mapState.activeRoute,
        hasRouteError: !!mapState.routeError,
        routeErrorMessage: mapState.routeError,
        locationStateAfter: {
          hasCurrentNodeId: postValidation.hasCurrentNodeId,
          nodeIdLocationConsistent: postValidation.nodeIdLocationConsistent,
          hasRouteCoordinates: mapState.activeRoute?.nodes?.length > 0
        },
        routeInfo: mapState.activeRoute ? {
          nodeCount: mapState.activeRoute.nodes?.length || 0,
          distance: mapState.activeRoute.total_distance || 0,
          estimatedTime: mapState.activeRoute.estimated_time || 0
        } : null
      });
      
      // 🎯 성공적인 경로 생성 확인
      if (mapState.activeRoute && mapState.activeRoute.nodes?.length > 0) {
        console.log('🎉 경로 표시 준비 완료:', {
          facility: facility.name,
          routeGenerated: true,
          readyForNavigation: true
        });
      } else if (mapState.routeError) {
        console.warn('⚠️ 경로 계산 후 오류 상태:', mapState.routeError);
      }
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error('❌ 경로 계산 실패 분석:', {
        duration: `${duration.toFixed(2)}ms`,
        error: error.message || error,
        facility: facility.name,
        locationStateAtFailure: preValidation.currentState
      });
    }
    
  }, [calculateRouteToFacility, clearRouteError]);

  // 음성 안내 기능 (TTS)
  const handleVoiceGuide = useCallback((facility) => {
    if (isSpeaking) {
      // 이미 재생 중이면 정지
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // 음성 안내 텍스트 구성
    const locationText = `${facility.name}은 ${facility.building} ${facility.floor}`;
    const roomText = facility.room ? ` ${facility.room}에 있습니다.` : '에 있습니다.';
    const descriptionText = facility.description ? ` ${facility.description}` : '';
    
    const fullText = `${locationText}${roomText}${descriptionText} 지도를 확인하시고 안내된 경로를 따라가세요.`;
    
    // Web Speech API 사용하여 음성 재생
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9; // 속도를 조금 느리게 (고령자 친화적)
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('음성 재생 오류:', event);
      setIsSpeaking(false);
      setError('음성 재생에 실패했습니다. 다시 시도해 주세요.');
    };
    
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking]);

  // 다른 시설 찾기 기능
  const handleFindOtherFacility = useCallback(() => {
    // 음성 재생 중이면 정지
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    
    // 시설 선택 초기화하고 메인 화면으로 돌아가기
    setSelectedFacility(null);
    setSelectedDepartment(null);
    setError('');
    
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isSpeaking]);


  // selectedDepartment는 더 이상 사용하지 않음 (selectedFacility로 통합)

  if (selectedFacility) {
    // mapStore에서 경로 데이터 가져오기
    const routeData = navigationRoute || activeRoute;
    
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
          {/* ✅ 향상된 경로 계산 오류 메시지 UI */}
          {routeError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6 shadow-lg animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-2xl">⚠️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-red-800 font-bold text-lg mb-2">경로를 찾을 수 없습니다</h3>
                  <p className="text-red-700 text-base leading-relaxed mb-4">{routeError}</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleFacilitySelect(selectedFacility)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
                      disabled={isRouteLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>다시 시도</span>
                    </button>
                    <button
                      onClick={clearRouteError}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-base hover:bg-gray-200 transition-all duration-300"
                    >
                      <span>닫기</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={clearRouteError}
                  className="text-red-400 hover:text-red-600 transition-colors p-1 flex-shrink-0"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ✅ 향상된 경로 계산 로딩 상태 UI */}
          {isRouteLoading && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-6 shadow-lg animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-300 border-t-blue-600"></div>
                </div>
                <div className="flex-1">
                  <p className="text-blue-800 font-bold text-lg mb-1">경로를 계산하고 있습니다</p>
                  <p className="text-blue-600 text-base">{selectedFacility?.name}까지의 최적 경로를 찾고 있어요.</p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-blue-500 text-sm font-medium">잠시만 기다려주세요</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl shadow-xl p-5 sm:p-6 mb-6" style={{backgroundColor: '#1d4ed8'}}>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-1">{selectedFacility.name}</h1>
              <p className="text-lg text-blue-100 mb-2">{selectedFacility.description}</p>
              
              {/* 위치 정보 텍스트와 구분선 */}
              <div className="border-t border-white/30 pt-4 mt-4">
                <p className="text-xl text-white flex items-center justify-center gap-2">
                  <MapPinIcon className="w-6 h-6 text-white" />
                  {selectedFacility.building} {selectedFacility.floor} {selectedFacility.room || ''}
                </p>
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
                pathNodes={routeData?.nodes || EMPTY_NODES}
                pathEdges={routeData?.edges || EMPTY_EDGES}
                currentLocation={{
                  name: '현재 위치',
                  x_coord: 150,
                  y_coord: 400,
                  building: '본관',
                  floor: '1층'
                }}
                targetLocation={selectedFacility}
              />
            </div>
            
            {/* 버튼 섹션 추가 */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleVoiceGuide(selectedFacility)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 ${
                    isSpeaking ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white rounded-xl font-semibold text-base transition-all duration-300 shadow-md hover:shadow-lg`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isSpeaking ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    )}
                  </svg>
                  <span>{isSpeaking ? '음성 정지' : '음성으로 듣기'}</span>
                </button>
                
                <button
                  onClick={handleFindOtherFacility}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-xl font-semibold text-base hover:bg-gray-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>다른 시설 찾기</span>
                </button>
              </div>
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

        {/* 구분선 */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* 진료과 섹션 - 실제 존재하는 부서들로 수정 */}
        <section className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            주요 진료과
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {commonDepartments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleFacilitySelect(dept)}
                className="group bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:border-gray-300 hover:shadow-lg transform hover:-translate-y-1 active:scale-95 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900 text-left">{dept.name}</h4>
                    <p className="text-base text-gray-700 text-left">{dept.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">{dept.building} {dept.floor}</span>
                      {dept.waitingPatients && (
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold w-[90px] text-center inline-block">{dept.waitingPatients} 대기</span>
                      )}
                    </div>
                  </div>
                  <ChevronRightIcon className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-all flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 구분선 */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* 검사·진단 섹션 - 새로 추가 */}
        <section className="mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            검사 · 진단
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {diagnosticFacilities.map((diagnostic) => (
              <button
                key={diagnostic.id}
                onClick={() => handleFacilitySelect(diagnostic)}
                className="group bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:border-gray-300 hover:shadow-lg transform hover:-translate-y-1 active:scale-95 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900 text-left">{diagnostic.name}</h4>
                    <p className="text-base text-gray-700 text-left">{diagnostic.description}</p>
                    <div className="mt-3 text-left">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium">{diagnostic.building} {diagnostic.floor}</span>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-all flex-shrink-0" />
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