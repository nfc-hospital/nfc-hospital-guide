import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, MapPinIcon, CalendarIcon, ClipboardDocumentListIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import MapNavigator from '../MapNavigator';
import useJourneyStore from '../../store/journeyStore';
import { PatientJourneyState, QueueDetailState } from '../../constants/states';
import { getDemoRouteForScreen } from '../../data/demoRoutes';
import { getDefaultLocationForState, generateDemoSchedule, generateDemoWaitingInfo } from '../../data/demoLocationData';

// 상태와 NFC 태그 정보를 기반으로 다음 행동 안내 문구 생성
const getNextActionText = (patientState, currentExam, taggedLocation, locationInfo) => {
  // locationInfo에서 정보 추출
  const destination = locationInfo?.name || locationInfo?.room || locationInfo?.description || '';
  const building = locationInfo?.building || '';
  const floor = locationInfo?.floor || '';
  
  // currentExam에서 정보 추출
  const examTitle = currentExam?.title || currentExam?.examName || '';
  const examRoom = currentExam?.room || currentExam?.location || '';
  
  // 상태별 구체적인 안내
  switch(patientState) {
    case 'ARRIVED':
      if (destination) {
        return `${destination}에서 접수하기`;
      }
      return '원무과에서 접수하기';
      
    case 'REGISTERED':
      if (destination) {
        // 층 정보가 있으면 포함
        if (building && floor) {
          return `${destination}으로 이동하기`;
        }
        return `${destination}실로 이동하기`;
      }
      if (examTitle && examRoom) {
        return `${examRoom} ${examTitle} 대기실로 이동하기`;
      }
      return '첫 번째 검사실로 이동하기';
      
    case 'WAITING':
      // 태그 위치가 있으면 이미 도착한 것으로 판단
      if (taggedLocation) {
        if (examTitle) {
          return `${examTitle} 순서 대기 중`;
        }
        if (destination) {
          return `${destination}에서 순서 대기 중`;
        }
        return '순서를 기다리고 있습니다';
      } else {
        // 아직 도착하지 않은 경우
        if (destination) {
          if (building && floor) {
            return `${destination} 대기실로 이동하기`;
          }
          return `${destination} 대기실로 이동하기`;
        }
        if (examTitle) {
          return `${examTitle} 대기실로 이동하기`;
        }
        return '검사 대기실로 이동하기';
      }
      
    case 'CALLED':
      if (examRoom) {
        return `${examRoom}실로 입장하기`;
      }
      if (destination) {
        return `${destination}실로 입장하기`;
      }
      return '검사실로 입장하기';
      
    case PatientJourneyState.IN_PROGRESS:
      if (examTitle) {
        return `${examTitle} 진행 중`;
      }
      if (destination) {
        return `${destination}실에서 검사 진행 중`;
      }
      return '검사 진행 중';
      
    case 'COMPLETED':
      // 다음 검사가 있는지 확인
      if (destination) {
        if (destination.includes('원무과') || destination.includes('수납')) {
          return '원무과에서 수납하기';
        }
        if (building && floor) {
          return `${building} ${floor} ${destination}실로 이동하기`;
        }
        return `다음 검사: ${destination}실로 이동하기`;
      }
      return '다음 검사실로 이동하기';
      
    case 'PAYMENT':
      if (destination && (destination.includes('원무과') || destination.includes('수납'))) {
        return `${destination}에서 수납하기`;
      }
      return '원무과에서 수납하기';
      
    case 'FINISHED':
      return '모든 검사가 완료되었습니다. 안전히 귀가하세요';
      
    default:
      // 기본값이지만 locationInfo가 있으면 활용
      if (destination) {
        return `${destination}로 이동하기`;
      }
      return '다음 단계로 진행하기';
  }
};

const FormatATemplate = ({
  screenType, // 'registered' | 'waiting' | 'payment' | 'arrived'
  patientState,
  taggedLocation,
  progressBar, // ✅ ProgressBar 컴포넌트 prop 추가
  header, // ✅ UnifiedHeader 컴포넌트 prop 추가
  mainContent, // ✅ Content 컴포넌트 prop 추가
  children
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(
    screenType === 'finished' || screenType === 'payment' ? 'content' : 'location'
  );
  const [expandedItems, setExpandedItems] = useState([]);
  const [showDemoMap, setShowDemoMap] = useState(true);
  const [isDemoExpanded, setIsDemoExpanded] = useState(true);
  
  // 🎯 Store에서 기본 데이터만 구독 (계산 함수는 useMemo로 메모이제이션)
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);
  const locationInfo = useJourneyStore(state => state.locationInfo);
  const currentLocation = useJourneyStore(state => state.currentLocation);
  const taggedLocationInfo = useJourneyStore(state => state.taggedLocationInfo);
  const currentQueues = useJourneyStore(state => state.currentQueues);

  // useMemo로 계산값 메모이제이션
  const todaySchedule = React.useMemo(() => {
    if (!todaysAppointments) return [];
    return todaysAppointments.map((apt, index) => ({
      id: apt.appointment_id,
      examName: apt.exam?.title || `검사 ${index + 1}`,
      location: apt.exam?.room || apt.exam?.title || '위치 미정',
      status: apt.status,
      description: apt.exam?.description,
      duration: apt.exam?.average_duration || 30,
      scheduled_at: apt.scheduled_at,
      exam: apt.exam
    }));
  }, [todaysAppointments]);

  const waitingInfo = React.useMemo(() => {
    const activeQueue = currentQueues?.find(
      q => q.state === 'waiting' || q.state === 'called' || q.state === 'in_progress'
    );

    if (activeQueue) {
      return {
        peopleAhead: activeQueue.queue_number > 0 ? activeQueue.queue_number - 1 : 0,
        estimatedTime: activeQueue.estimated_wait_time || 15,
        queueNumber: activeQueue.queue_number || 1,
        priority: activeQueue.priority || 'normal'
      };
    }
    return null;
  }, [currentQueues]);

  const currentStep = React.useMemo(() => {
    const current = todaySchedule.findIndex(s =>
      ['waiting', 'called', 'in_progress'].includes(s.status)
    );
    return current === -1 ? 0 : current;
  }, [todaySchedule]);

  const totalSteps = todaysAppointments?.length || 0;
  
  // 실제 현재 위치 정보 우선 사용
  const actualCurrentLocation = taggedLocationInfo || taggedLocation || currentLocation;

  // currentExam을 useMemo로 계산
  const currentExam = React.useMemo(() => {
    const activeQueue = currentQueues?.find(
      q => q.state === 'waiting' || q.state === 'called' || q.state === 'in_progress'
    );
    return activeQueue?.exam || todaysAppointments?.[0]?.exam || null;
  }, [currentQueues, todaysAppointments]);

  // 데모 모드 데이터 사용 (locationInfo가 없을 때)
  const effectiveLocationInfo = React.useMemo(() => {
    if (locationInfo) return locationInfo;

    // 데모 데이터 사용
    const demoLocation = getDefaultLocationForState(patientState);
    return demoLocation;
  }, [locationInfo, patientState]);

  // 데모 일정 사용 (todaySchedule이 비어있을 때)
  const effectiveSchedule = React.useMemo(() => {
    if (todaySchedule && todaySchedule.length > 0) return todaySchedule;
    return generateDemoSchedule();
  }, [todaySchedule]);

  // 데모 대기 정보 사용 (waitingInfo가 없을 때)
  const effectiveWaitingInfo = React.useMemo(() => {
    if (waitingInfo) return waitingInfo;
    if (patientState === 'WAITING' || patientState === 'CALLED') {
      return generateDemoWaitingInfo();
    }
    return null;
  }, [waitingInfo, patientState]);

  // nextAction 자동 생성 (effectiveLocationInfo 사용)
  const displayNextAction = getNextActionText(patientState, currentExam, actualCurrentLocation, effectiveLocationInfo);

  const toggleExpanded = (index) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  

  const getStepLabel = (index) => {
    // 실제 일정 데이터가 있으면 사용, 없으면 기본값
    if (todaySchedule && todaySchedule[index]) {
      const examName = todaySchedule[index].examName;
      // 검사명이 길면 줄임
      return examName.length > 6 ? examName.substring(0, 6) + '...' : examName;
    }
    const defaultLabels = ['접수', '채혈', '심전도', 'X-ray', '진료', '처방', '수납'];
    return defaultLabels[index] || `검사${index + 1}`;
  };
  
  // 상태 한글 변환
  const getStepStatus = (status) => {
    const statusMap = {
      'pending': '대기',
      'scheduled': '예정',
      [QueueDetailState.WAITING]: '대기중',
      [QueueDetailState.CALLED]: '호출됨',
      [QueueDetailState.IN_PROGRESS]: '진행중',
      [QueueDetailState.COMPLETED]: '완료',
      [QueueDetailState.DELAYED]: '지연',
      [QueueDetailState.CANCELLED]: '취소'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case QueueDetailState.COMPLETED: return 'bg-gray-100 text-gray-600';
      case QueueDetailState.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
      case QueueDetailState.WAITING: return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  return (
    <div className="w-full">
      {/* ✅ UnifiedHeader 렌더링 */}
      {header && header}

      {/* 상단 영역 - 파란색 배경 - 컴팩트하게 */}
      <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700">
          {/* 살짝의 장식 요소 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -left-12 w-36 h-36 bg-blue-400/10 rounded-full blur-2xl" />
          </div>
          
          <div className="relative px-4 sm:px-6 lg:px-8 py-3 sm:py-4 pb-12 sm:pb-16">
            {/* ✅ ProgressBar 컴포넌트 사용 (항상 표시) */}
            {progressBar && (
              <div className="mb-3 sm:mb-4">
                {progressBar}
              </div>
            )}

            {/* 다음 행동 안내 - 맥박 애니메이션 포함 */}
            <div className="bg-white/20 backdrop-blur-lg rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 border border-white/30 hover:bg-white/25 transition-all duration-300">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-amber-400 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-amber-400 rounded-full animate-ping" />
                </div>
                <span className="text-amber-400 text-sm sm:text-base font-medium">다음</span>
                <span className="text-white text-base sm:text-lg lg:text-xl font-bold flex-1">{displayNextAction}</span>
              </div>
            </div>

            {/* 대기 정보 카드 - 반투명 유리 효과 */}
            {effectiveWaitingInfo && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl sm:rounded-3xl px-4 py-2 sm:py-2.5 border border-white/30 hover:bg-white/25 transition-all duration-300">
                  <div className="text-center">
                    <p className="text-white/80 text-xs sm:text-sm whitespace-nowrap">내 앞에</p>
                    <p className="text-white text-lg sm:text-xl font-bold">
                      {effectiveWaitingInfo.peopleAhead}<span className="text-sm sm:text-base font-normal ml-0.5">명</span>
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl sm:rounded-3xl px-4 py-2 sm:py-2.5 border border-white/30 hover:bg-white/25 transition-all duration-300">
                  <div className="text-center">
                    <p className="text-white/80 text-xs sm:text-sm whitespace-nowrap">예상 대기</p>
                    <p className="text-white text-lg sm:text-xl font-bold">
                      {effectiveWaitingInfo.estimatedTime}<span className="text-sm sm:text-base font-normal ml-0.5">분</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 영역 - 흰색 배경 */}
        <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 -mt-8 rounded-t-[2.5rem] relative shadow-xl">
          {/* 탭 네비게이션 - 모던한 스타일 */}
          <div className="flex gap-0 mb-6 border-b border-gray-100">
            <button
              onClick={() => setActiveTab('location')}
              className={`flex-1 pb-3 pt-2 flex items-center justify-center gap-2 transition-all duration-300 relative ${
                activeTab === 'location' 
                  ? 'text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <MapPinIcon className="w-5 h-5" />
              <span className="font-medium">위치 안내</span>
              {activeTab === 'location' && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600" />
              )}
            </button>
            {/* 준비사항 탭은 필요시 추가 - 현재는 제거 */}
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 pb-3 pt-2 flex items-center justify-center gap-2 transition-all duration-300 relative ${
                activeTab === 'schedule' 
                  ? 'text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="font-medium">오늘의 일정</span>
              {activeTab === 'schedule' && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600" />
              )}
            </button>
            {(screenType === 'finished' || screenType === 'payment') && (
              <button
                onClick={() => setActiveTab('content')}
                className={`flex-1 pb-3 pt-2 flex items-center justify-center gap-2 transition-all duration-300 relative ${
                  activeTab === 'content' 
                    ? 'text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-medium">{screenType === 'finished' ? '완료' : '수납'}</span>
                {activeTab === 'content' && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600" />
                )}
              </button>
            )}
          </div>

          {/* 탭 내용 */}
          <div className="min-h-[200px]">
            {activeTab === 'location' ? (
              <div className="space-y-4">
                {/* 위치 정보 - 깔끔한 카드 디자인 */}
                {effectiveLocationInfo ? (
                  <div className="mb-4">
                    {/* 목적지 정보 - 현재 위치 -> 목적지 형식 */}
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                      <div className="flex items-center justify-center text-sm sm:text-base">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">현재:</span>
                          <span className="font-medium text-gray-800">
                            {(() => {
                              if (actualCurrentLocation?.description) {
                                return actualCurrentLocation.description;
                              }
                              if (actualCurrentLocation?.building && actualCurrentLocation?.floor) {
                                const room = actualCurrentLocation.room ? ` ${actualCurrentLocation.room}` : '';
                                return `${actualCurrentLocation.building} ${actualCurrentLocation.floor}${room}`;
                              }
                              return '현재 위치';
                            })()}
                          </span>
                        </div>
                        <span className="text-gray-400 mx-4">→</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">목적지:</span>
                          <span className="font-semibold text-blue-700">
                            {effectiveLocationInfo.name || effectiveLocationInfo.room || '목적지'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    {/* 기본 위치 안내 (데이터가 없을 때) */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <MapPinIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">위치 안내 준비 중</h4>
                        <p className="text-sm text-gray-700 mb-3">
                          {patientState === 'UNREGISTERED'
                            ? '로그인하시면 맞춤 경로를 안내받을 수 있습니다'
                            : 'NFC 태그를 스캔하면 정확한 경로를 안내받을 수 있습니다'}
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            style={{ display: patientState === 'UNREGISTERED' ? 'block' : 'none' }}
                          >
                            로그인하기
                          </button>
                          <button
                            onClick={() => setShowDemoMap(true)}
                            className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                          >
                            데모 보기
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 지도 표시 영역 - 항상 표시 */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden relative">
                  <div>
                    {/* 시연 모드 토글 버튼 - 왼쪽 아래 */}
                    <div className="absolute bottom-2 left-2 z-30">
                      <button
                        onClick={() => setShowDemoMap(!showDemoMap)}
                        className={`w-10 h-10 rounded-full text-lg transition-all flex items-center justify-center ${
                          showDemoMap 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'bg-white border-2 border-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        🎬
                      </button>
                    </div>

                    {/* 실제 지도 (데이터 연동) */}
                    <div className={showDemoMap ? 'opacity-30' : ''}>
                      <div className="p-6">
                        <MapNavigator
                          mapId={effectiveLocationInfo?.mapFile?.replace('.svg', '') || 'main_1f'}
                          highlightRoom={effectiveLocationInfo?.name || ''}
                          facilityName={effectiveLocationInfo?.name || ''}
                          multiFloor={false} // 실제 데이터는 단일 층만
                          startFloor="main_1f"
                          endFloor={effectiveLocationInfo?.mapFile?.replace('.svg', '') || 'main_2f'}
                          pathNodes={[]} // 실제 경로는 API 연동 시 표시
                          pathEdges={[]}
                        />
                      </div>
                    </div>

                    {/* 시연용 지도 오버레이 */}
                    {showDemoMap && (
                      <div className="absolute inset-0 bg-white transition-all duration-300">
                        {/* 시연용 지도 내용 - 상태별 자동 선택 */}
                        <div className="p-4 h-full">
                          <MapNavigator
                            mapId={(() => {
                              // 상태별 적절한 지도 선택
                              const demoRoute = getDemoRouteForScreen(patientState) || getDemoRouteForScreen(screenType);
                              return demoRoute?.mapId || 'main_1f';
                            })()}
                            highlightRoom={effectiveLocationInfo?.name || ''}
                            facilityName={(() => {
                              // 상태별 시연 경로 이름
                              const demoRoute = getDemoRouteForScreen(patientState) || getDemoRouteForScreen(screenType);
                              return demoRoute?.facilityName || '시연_경로';
                            })()}
                            multiFloor={false} // 단일 층 표시
                            startFloor="main_1f"
                            endFloor="main_2f"
                            pathNodes={(() => {
                              // 현재 상태에 맞는 시연 경로
                              const demoRoute = getDemoRouteForScreen(patientState) || getDemoRouteForScreen(screenType);
                              console.log('🎬 시연 모드 경로:', {
                                state: patientState,
                                screenType: screenType,
                                route: demoRoute?.facilityName,
                                nodeCount: demoRoute?.nodes?.length || 0
                              });
                              return demoRoute?.nodes || [];
                            })()}
                            pathEdges={(() => {
                              const demoRoute = getDemoRouteForScreen(patientState) || getDemoRouteForScreen(screenType);
                              return demoRoute?.edges || [];
                            })()}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 접수 안내 - ARRIVED 상태일 때만 표시 */}
                {screenType === 'arrived' && (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      📝 접수하는 방법
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          1
                        </div>
                        <p className="text-sm text-gray-800">원무과 접수 창구로 가세요</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          2
                        </div>
                        <p className="text-sm text-gray-800">신분증과 건강보험증을 제출하세요</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          3
                        </div>
                        <p className="text-sm text-gray-800">접수 완료 후 검사실 안내를 받으세요</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 다른 장소 찾기 버튼 */}
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl p-3 font-medium transition-all duration-300"
                >
                  다른 장소 찾기 →
                </button>
              </div>
            ) : activeTab === 'preparation' ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardDocumentListIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">준비사항이 없습니다</p>
                </div>
              </div>
            ) : activeTab === 'content' ? (
              <div className="space-y-4">
                {/* ✅ mainContent 사용 */}
                {mainContent || children}
              </div>
            ) : (
              <div className="space-y-3">
                {/* 오늘의 일정 아코디언 */}
                {todaySchedule && todaySchedule.length > 0 ? todaySchedule.map((schedule, index) => {
                  const isExpanded = expandedItems.includes(index);
                  const isCurrentStep = index === currentStep;
                  
                  return (
                    <div 
                      key={index}
                      className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                        isCurrentStep ? 'border-blue-300 shadow-md' : 'border-gray-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleExpanded(index)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                      >
                        {/* 번호 원형 */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isCurrentStep ? 'bg-blue-600 text-white' : 
                          index < currentStep ? 'bg-gray-300 text-gray-600' : 
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* 일정 정보 */}
                        <div className="flex-1 text-left">
                          <h4 className="font-semibold text-gray-900">{schedule.examName}</h4>
                          <p className="text-sm text-gray-600">
                            {schedule.location}
                            {isCurrentStep && waitingInfo && (
                              <span className="ml-2 text-amber-600">
                                • 내 앞에 {waitingInfo.peopleAhead}명
                              </span>
                            )}
                          </p>
                        </div>
                        
                        {/* 펼침/접힘 화살표 - 회전 애니메이션 */}
                        <ChevronDownIcon 
                          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>
                      
                      {/* 상세 정보 - 부드러운 애니메이션 */}
                      <div 
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-gray-100">
                          <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-blue-50/90 transition-colors duration-300 transform transition-transform hover:scale-[1.02]">
                            <h5 className="text-sm font-medium text-blue-900 mb-1">검사 목적</h5>
                            <p className="text-sm text-blue-700">{schedule.purpose || schedule.description || '건강 상태 확인 및 진단'}</p>
                          </div>
                          
                          {schedule.preparation && (
                            <div className="bg-amber-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-amber-50/90 transition-colors duration-300 transform transition-transform hover:scale-[1.02]">
                              <h5 className="text-sm font-medium text-amber-900 mb-1">준비사항</h5>
                              <p className="text-sm text-amber-700">{schedule.preparation}</p>
                            </div>
                          )}
                          
                          <div className="bg-gray-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-gray-50/90 transition-colors duration-300 transform transition-transform hover:scale-[1.02]">
                            <h5 className="text-sm font-medium text-gray-900 mb-1">소요시간</h5>
                            <p className="text-sm text-gray-700">약 {schedule.duration}분</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  // 데이터가 없을 때 기본 내용 표시
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">📅</span>
                    </div>
                    <p className="text-gray-500 text-lg mb-2">오늘 예정된 검사가 없습니다</p>
                    <p className="text-gray-400 text-sm">백엔드 연결 상태를 확인하거나 예약을 확인해주세요</p>
                  </div>
                )}
              </div>
            )}
          </div>

          
          {/* NFC 안내 - 최하단 - 세련되게 */}
          <div className="mt-auto pt-6 pb-8">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} 
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <circle cx="12" cy="12" r="3" strokeWidth={2} className="animate-pulse" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    벽의 <span className="text-blue-600">파란 NFC 스티커</span>에 핸드폰을 대 주세요
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    현재 위치에서 목적지까지 안내해 드립니다
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default FormatATemplate;