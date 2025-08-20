import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import MapNavigator from '../MapNavigator';
import useJourneyStore from '../../store/journeyStore';

// 상태와 NFC 태그 정보를 기반으로 다음 행동 안내 문구 생성
const getNextActionText = (patientState, currentExam, taggedLocation, nextLocation) => {
  // 상태별 기본 행동
  const stateActions = {
    'ARRIVED': '원무과에서 접수하기',
    'REGISTERED': '첫 번째 검사실로 이동하기',
    'WAITING': '대기실에서 순서 기다리기',
    'CALLED': '검사실로 입장하기',
    'ONGOING': '검사 진행 중',
    'COMPLETED': '다음 검사실로 이동하기',
    'PAYMENT': '원무과에서 수납하기',
    'FINISHED': '귀가하기'
  };

  // 현재 위치와 목적지가 있는 경우 구체적인 안내
  if (taggedLocation && nextLocation) {
    const currentPlace = taggedLocation.description || `${taggedLocation.building} ${taggedLocation.floor}층`;
    const destination = nextLocation.name || nextLocation.room || '목적지';
    
    if (patientState === 'REGISTERED' || patientState === 'COMPLETED') {
      return `${destination}(으)로 이동하기`;
    }
    if (patientState === 'WAITING') {
      return `${destination} 대기실에서 기다리기`;
    }
  }

  // 현재 검사 정보가 있는 경우
  if (currentExam) {
    if (patientState === 'WAITING') {
      return `${currentExam.title} 대기 중 (${currentExam.room})`;
    }
    if (patientState === 'CALLED') {
      return `${currentExam.room}으로 입장하기`;
    }
    if (patientState === 'ONGOING') {
      return `${currentExam.title} 진행 중`;
    }
  }

  // 기본 상태별 행동
  return stateActions[patientState] || '다음 단계로 진행하기';
};

const FormatATemplate = ({ 
  screenType, // 'registered' | 'waiting' | 'payment'
  currentStep,
  totalSteps,
  nextAction,
  waitingInfo,
  locationInfo,
  todaySchedule,
  queueData,
  taggedLocation,
  patientState, // 환자의 현재 상태 추가
  currentExam, // 현재 진행 중인 검사
  children
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('location');
  const [expandedItems, setExpandedItems] = useState([]);
  const [showDemoMap, setShowDemoMap] = useState(false);
  const [isDemoExpanded, setIsDemoExpanded] = useState(true);
  
  // journeyStore에서 현재 위치 정보 가져오기
  const { currentLocation, taggedLocationInfo } = useJourneyStore();
  
  // 실제 현재 위치 정보 우선 사용
  const actualCurrentLocation = taggedLocationInfo || taggedLocation || currentLocation;
  
  // nextAction이 없으면 자동 생성
  const displayNextAction = nextAction || getNextActionText(patientState, currentExam, actualCurrentLocation, locationInfo);

  const toggleExpanded = (index) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // 전체 여정 단계 구성 (도착 - 접수 - 모든 검사/진료 - 수납 - 완료)
  const buildFullJourneySteps = () => {
    const steps = [];
    
    // 기본 단계들
    steps.push({ state: 'ARRIVED', label: '도착', isFixed: true, status: 'completed' });
    steps.push({ state: 'REGISTERED', label: '접수', isFixed: true, status: 'completed' });
    
    // 모든 검사/진료 추가
    if (todaySchedule && todaySchedule.length > 0) {
      todaySchedule.forEach((exam, index) => {
        steps.push({
          state: 'EXAM', // 검사는 모두 EXAM 상태로 통일
          label: exam.examName || `검사 ${index + 1}`,
          examId: exam.id,
          status: exam.status || 'scheduled', // appointment의 status 사용
          isFixed: false
        });
      });
    }
    
    // 마지막 고정 단계들
    steps.push({ state: 'PAYMENT', label: '수납', isFixed: true, status: 'scheduled' });
    steps.push({ state: 'FINISHED', label: '완료', isFixed: true, status: 'scheduled' });
    
    return steps;
  };
  
  // 현재 단계 찾기
  const getCurrentStepIndex = (steps) => {
    // 환자 상태에 따른 현재 단계 찾기
    if (patientState === 'ARRIVED') return 0;
    if (patientState === 'FINISHED') return steps.length - 1;
    
    // 수납 상태
    if (patientState === 'PAYMENT') {
      return steps.findIndex(s => s.state === 'PAYMENT');
    }
    
    // 접수 완료 후 첫 검사 대기 중
    if (patientState === 'REGISTERED') {
      // 첫 번째 검사를 찾아서 현재 단계로
      const firstExamIdx = steps.findIndex(s => s.state === 'EXAM');
      if (firstExamIdx !== -1) return firstExamIdx;
      return 1; // 없으면 접수 단계
    }
    
    // 검사/진료 관련 상태 (WAITING, CALLED, ONGOING, COMPLETED)
    if (['WAITING', 'CALLED', 'ONGOING', 'COMPLETED'].includes(patientState)) {
      // 현재 진행 중인 검사 찾기 (waiting, called, ongoing 상태)
      let activeExamIndex = -1;
      
      // 모든 검사를 순회하면서 현재 활성화된 검사 찾기
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.state === 'EXAM') {
          // waiting, called, ongoing 상태인 검사를 현재로
          if (['waiting', 'called', 'ongoing'].includes(step.status)) {
            activeExamIndex = i;
            break;
          }
        }
      }
      
      if (activeExamIndex !== -1) {
        return activeExamIndex;
      }
      
      // 진행 중인 검사가 없고 COMPLETED 상태라면
      if (patientState === 'COMPLETED') {
        // 완료된 검사 중 가장 최근 것 찾기
        let lastCompletedIdx = -1;
        for (let i = 0; i < steps.length; i++) {
          if (steps[i].state === 'EXAM' && steps[i].status === 'completed') {
            lastCompletedIdx = i;
          }
        }
        
        // 다음 검사가 있는지 확인
        if (lastCompletedIdx !== -1 && lastCompletedIdx + 1 < steps.length) {
          const nextStep = steps[lastCompletedIdx + 1];
          if (nextStep.state === 'EXAM') {
            return lastCompletedIdx + 1; // 다음 검사로
          }
        }
        
        // 모든 검사가 완료되면 수납으로
        const allExamsCompleted = steps
          .filter(s => s.state === 'EXAM')
          .every(s => s.status === 'completed');
        
        if (allExamsCompleted) {
          return steps.findIndex(s => s.state === 'PAYMENT');
        }
      }
    }
    
    // 기본값: 접수
    return 1;
  };
  
  // 화면에 표시할 3개 단계 선택
  const getVisibleSteps = () => {
    const allSteps = buildFullJourneySteps();
    const currentIdx = getCurrentStepIndex(allSteps);
    
    // 디버깅을 위한 로그 (개발 환경에서만)
    if (import.meta.env.DEV) {
      console.log('📊 진행 상태 디버그:', {
        patientState,
        currentExam,
        todaySchedule: todaySchedule?.map(s => ({ name: s.examName, status: s.status })),
        allSteps: allSteps.map((s, i) => ({ 
          index: i, 
          label: s.label, 
          state: s.state, 
          status: s.status, 
          isFixed: s.isFixed 
        })),
        currentIdx,
        currentStep: allSteps[currentIdx],
        visibleRange: `${Math.max(0, currentIdx - 1)} to ${Math.min(allSteps.length - 1, currentIdx + 1)}`
      });
    }
    
    // 이전, 현재, 다음 단계 선택
    const visibleSteps = [];
    
    // 이전 단계가 있으면 추가
    if (currentIdx > 0) {
      visibleSteps.push({ ...allSteps[currentIdx - 1], position: 'prev' });
    }
    
    // 현재 단계
    visibleSteps.push({ ...allSteps[currentIdx], position: 'current' });
    
    // 다음 단계가 있으면 추가
    if (currentIdx < allSteps.length - 1) {
      visibleSteps.push({ ...allSteps[currentIdx + 1], position: 'next' });
    }
    
    // 3개가 안 되는 경우 처리
    if (visibleSteps.length === 2) {
      if (currentIdx === 0) {
        // 첫 번째 단계인 경우, 다다음 단계 추가
        if (allSteps.length > 2) {
          visibleSteps.push({ ...allSteps[2], position: 'next' });
        }
      } else if (currentIdx === allSteps.length - 1) {
        // 마지막 단계인 경우, 전전 단계 추가
        if (allSteps.length > 2) {
          visibleSteps.unshift({ ...allSteps[currentIdx - 2], position: 'prev' });
        }
      }
    }
    
    return {
      visible: visibleSteps,
      currentStep: currentIdx,
      totalSteps: allSteps.length
    };
  };
  
  // 진행 단계 렌더링
  const renderProgressSteps = () => {
    const { visible: stepsToShow } = getVisibleSteps();
    
    return stepsToShow.map((step, index) => {
      const isCurrent = step.position === 'current';
      const isCompleted = step.position === 'prev';
      
      return (
        <div key={index} className="flex flex-col items-center relative flex-1">
          {/* 연결선 - 그라데이션으로 부드럽게 */}
          {index > 0 && (
            <div className="absolute top-5 sm:top-6 h-0.5" style={{
              left: '-50%',
              right: '50%',
              background: isCompleted || isCurrent
                ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.7) 20%, rgba(255,255,255,0.7) 80%, transparent)'
                : 'linear-gradient(to right, transparent, rgba(255,255,255,0.25) 20%, rgba(255,255,255,0.25) 80%, transparent)'
            }} />
          )}
          
          {/* 단계 원 - 컴팩트한 디자인 */}
          <div className="relative">
            {/* 현재 단계 강조 효과 - 제거 */}
            
            {/* 메인 원 */}
            <div className={`
              relative w-7 h-7 sm:w-8 sm:h-8 rounded-full 
              flex items-center justify-center transition-all duration-500 
              ${isCompleted 
                ? 'bg-white shadow-md' 
                : isCurrent 
                ? 'bg-amber-400 shadow-lg ring-2 ring-white/30 scale-110' 
                : 'bg-white/15 backdrop-blur-sm border border-white/25'
              }
            `}>
              {isCompleted ? (
                <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              ) : isCurrent ? (
                <div className="w-2 h-2 bg-white rounded-full" />
              ) : (
                <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
              )}
            </div>
          </div>
          
          {/* 단계 라벨 - 작게 */}
          <div className="mt-2">
            <div className={`text-xs font-medium transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-[70px] ${
              isCurrent ? 'text-white' : isCompleted ? 'text-white/90' : 'text-white/60'
            }`}>
              {step.label}
            </div>
          </div>
        </div>
      );
    });
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
      'waiting': '대기중',
      'called': '호출됨',
      'ongoing': '진행중',
      'completed': '완료',
      'delayed': '지연',
      'cancelled': '취소'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-gray-100 text-gray-600';
      case 'ongoing': return 'bg-blue-100 text-blue-700';
      case 'waiting': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  return (
    <div className="w-full">
      {/* 상단 영역 - 파란색 배경 - 높이 축소 */}
      <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 overflow-hidden">
          {/* 살짝의 장식 요소 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -left-12 w-36 h-36 bg-blue-400/10 rounded-full blur-2xl" />
          </div>
          
          <div className="relative px-6 sm:px-8 lg:px-10 py-6 pb-8">
            {/* 진행 상태바 */}
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {renderProgressSteps()}
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-white/70 text-xs sm:text-sm mb-0.5">진행 상황</div>
                  <div className="text-white flex items-baseline gap-0.5">
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-bold">{getVisibleSteps().currentStep + 1}</span>
                    <span className="text-xl sm:text-2xl lg:text-3xl text-white/70">/{getVisibleSteps().totalSteps}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 다음 행동 안내 - 맥박 애니메이션 포함 */}
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-4 mb-5 border border-white/30 hover:bg-white/25 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
                </div>
                <span className="text-amber-400 text-base sm:text-lg font-medium">다음</span>
                <span className="text-white text-xl sm:text-2xl font-bold flex-1">{displayNextAction}</span>
              </div>
            </div>

            {/* 대기 정보 카드 - 반투명 유리 효과 */}
            {waitingInfo && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl px-4 py-3 sm:py-4 border border-white/30 hover:bg-white/25 transition-all duration-300">
                  <div className="text-center">
                    <p className="text-white/80 text-xs mb-1">내 앞에</p>
                    <p className="text-white text-2xl sm:text-3xl font-bold">
                      {waitingInfo.peopleAhead}<span className="text-lg sm:text-xl font-normal ml-1">명</span>
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-lg rounded-2xl px-4 py-3 sm:py-4 border border-white/30 hover:bg-white/25 transition-all duration-300">
                  <div className="text-center">
                    <p className="text-white/80 text-xs mb-1">예상 대기</p>
                    <p className="text-white text-2xl sm:text-3xl font-bold">
                      {waitingInfo.estimatedTime}<span className="text-lg sm:text-xl font-normal ml-1">분</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 영역 - 흰색 배경 */}
        <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 -mt-6 rounded-t-3xl relative shadow-xl">
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
          </div>

          {/* 탭 내용 */}
          <div className="min-h-[400px] lg:min-h-[500px]">
            {activeTab === 'location' ? (
              <div className="space-y-4">
                {/* 위치 정보 - 깔끔한 카드 디자인 */}
                {locationInfo && (
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
                                return `${actualCurrentLocation.building} ${actualCurrentLocation.floor}층${room}`;
                              }
                              return '현재 위치';
                            })()}
                          </span>
                        </div>
                        <span className="text-gray-400 mx-4">→</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">목적지:</span>
                          <span className="font-semibold text-blue-700">
                            {locationInfo.name || locationInfo.room || '목적지'}
                          </span>
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
                          mapId={locationInfo?.mapFile?.replace('.svg', '') || 'main_1f'}
                          highlightRoom={locationInfo?.name || ''}
                          facilityName={locationInfo?.name || ''}
                          multiFloor={false} // 실제 데이터는 단일 층만
                          startFloor="main_1f"
                          endFloor={locationInfo?.mapFile?.replace('.svg', '') || 'main_2f'}
                        />
                      </div>
                    </div>

                    {/* 시연용 지도 오버레이 */}
                    {showDemoMap && (
                      <div className="absolute inset-0 bg-white transition-all duration-300">
                        {/* 시연용 지도 내용 - 심플하게 */}
                        <div className="p-4 h-full">
                          <MapNavigator 
                            mapId="main_1f"
                            highlightRoom="내과 대기실"
                            facilityName="시연_1층_로비에서_엘리베이터" // 시연용 경로 사용
                            multiFloor={true} // 시연용은 다중 층 활성화
                            startFloor="main_1f"
                            endFloor="main_2f"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 다른 장소 찾기 버튼 */}
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl p-3 font-medium transition-all duration-300"
                >
                  다른 장소 찾기 →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 오늘의 일정 아코디언 */}
                {todaySchedule && todaySchedule.map((schedule, index) => {
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
                            {isCurrentStep && queueData && (
                              <span className="ml-2 text-amber-600">
                                • 내 앞에 {queueData.peopleAhead}명
                              </span>
                            )}
                          </p>
                        </div>
                        
                        {/* 펼침/접힘 화살표 */}
                        {isExpanded ? (
                          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      {/* 상세 정보 */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                          <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-blue-50/90 transition-colors duration-300">
                            <h5 className="text-sm font-medium text-blue-900 mb-1">검사 목적</h5>
                            <p className="text-sm text-blue-700">{schedule.purpose || schedule.description || '건강 상태 확인 및 진단'}</p>
                          </div>
                          
                          {schedule.preparation && (
                            <div className="bg-amber-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-amber-50/90 transition-colors duration-300">
                              <h5 className="text-sm font-medium text-amber-900 mb-1">준비사항</h5>
                              <p className="text-sm text-amber-700">{schedule.preparation}</p>
                            </div>
                          )}
                          
                          <div className="bg-gray-50/80 backdrop-blur-sm rounded-lg p-3 hover:bg-gray-50/90 transition-colors duration-300">
                            <h5 className="text-sm font-medium text-gray-900 mb-1">소요시간</h5>
                            <p className="text-sm text-gray-700">약 {schedule.duration}분</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 추가 컨텐츠 영역 */}
          {children && (
            <div className="mt-6">
              {children}
            </div>
          )}
          
          {/* NFC 안내 - 최하단에 회색톤으로 */}
          <div className="mt-auto pt-4 pb-2">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="text-xl">📲</div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">
                    병원 곳곳의 NFC 스티커에 휴대폰을 대 보세요
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    현재 위치에서 가야 할 곳까지 길을 안내해드립니다
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