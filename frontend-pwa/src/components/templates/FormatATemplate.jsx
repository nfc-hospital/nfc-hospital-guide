import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

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
  children
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('location');
  const [expandedItems, setExpandedItems] = useState([]);

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
    steps.push({ state: 'ARRIVED', label: '도착', isFixed: true });
    steps.push({ state: 'REGISTERED', label: '접수', isFixed: true });
    
    // 모든 검사/진료 추가
    if (todaySchedule && todaySchedule.length > 0) {
      todaySchedule.forEach((exam, index) => {
        steps.push({
          state: exam.status === 'completed' ? 'COMPLETED' : 
                 exam.status === 'ongoing' ? 'ONGOING' : 
                 exam.status === 'called' ? 'WAITING' : 'WAITING',
          label: exam.examName || `검사 ${index + 1}`,
          examId: exam.id,
          status: exam.status,
          isFixed: false
        });
      });
    }
    
    // 마지막 고정 단계들
    steps.push({ state: 'PAYMENT', label: '수납', isFixed: true });
    steps.push({ state: 'FINISHED', label: '완료', isFixed: true });
    
    return steps;
  };
  
  // 현재 단계 찾기
  const getCurrentStepIndex = (steps) => {
    // 환자 상태에 따른 현재 단계 찾기
    if (patientState === 'ARRIVED') return 0;
    if (patientState === 'REGISTERED') return 1;
    if (patientState === 'PAYMENT') return steps.findIndex(s => s.state === 'PAYMENT');
    if (patientState === 'FINISHED') return steps.findIndex(s => s.state === 'FINISHED');
    
    // 검사/진료 중인 경우
    if (patientState === 'WAITING' || patientState === 'ONGOING' || patientState === 'CALLED') {
      // 현재 진행 중인 검사 찾기
      const activeExamIndex = steps.findIndex(s => 
        !s.isFixed && (s.status === 'waiting' || s.status === 'called' || s.status === 'ongoing')
      );
      return activeExamIndex !== -1 ? activeExamIndex : 2; // 기본값: 첫 번째 검사
    }
    
    // 검사 완료 상태
    if (patientState === 'COMPLETED') {
      // 마지막으로 완료된 검사 찾기
      let lastCompletedIndex = -1;
      steps.forEach((s, idx) => {
        if (!s.isFixed && s.status === 'completed') {
          lastCompletedIndex = idx;
        }
      });
      return lastCompletedIndex !== -1 ? lastCompletedIndex : 2;
    }
    
    return 1; // 기본값: 접수
  };
  
  // 화면에 표시할 3개 단계 선택
  const getVisibleSteps = () => {
    const allSteps = buildFullJourneySteps();
    const currentIdx = getCurrentStepIndex(allSteps);
    
    // 이전, 현재, 다음 단계 선택
    const visibleSteps = [];
    
    // 이전 단계
    if (currentIdx > 0) {
      visibleSteps.push({ ...allSteps[currentIdx - 1], position: 'prev' });
    }
    
    // 현재 단계
    visibleSteps.push({ ...allSteps[currentIdx], position: 'current' });
    
    // 다음 단계
    if (currentIdx < allSteps.length - 1) {
      visibleSteps.push({ ...allSteps[currentIdx + 1], position: 'next' });
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
          
          {/* 단계 원 - 작고 미니멀한 디자인 */}
          <div className="relative">
            {/* 현재 단계 강조 효과 */}
            {isCurrent && (
              <>
                <div className="absolute inset-0 w-10 h-10 sm:w-12 sm:h-12 bg-amber-400/30 rounded-full blur-xl animate-pulse" />
                <div className="absolute inset-0 w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full blur-2xl animate-pulse" style={{animationDelay: '0.5s'}} />
              </>
            )}
            
            {/* 메인 원 */}
            <div className={`
              relative w-8 h-8 sm:w-10 sm:h-10 rounded-full 
              flex items-center justify-center transition-all duration-700 
              ${isCompleted 
                ? 'bg-white shadow-lg hover:shadow-xl' 
                : isCurrent 
                ? 'bg-amber-400 shadow-2xl ring-4 ring-white/40 scale-110' 
                : 'bg-white/15 backdrop-blur-sm border border-white/25 hover:bg-white/20'
              }
            `}>
              {isCompleted ? (
                <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              ) : isCurrent ? (
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full shadow-inner" />
              ) : (
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/50 rounded-full" />
              )}
            </div>
          </div>
          
          {/* 단계 라벨 - 깔끔하고 읽기 쉽게 */}
          <div className="mt-2.5">
            <div className={`text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px] sm:max-w-[100px] ${
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
    <div className="min-h-screen bg-white">
      <div className="w-full h-screen flex flex-col">
        {/* 상단 영역 - 파란색 배경 */}
        <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 overflow-hidden">
          {/* 부드러운 장식 요소 */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 -left-16 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          </div>
          
          <div className="relative px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-8 sm:pb-10">
            {/* 진행 상태바 */}
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {renderProgressSteps()}
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-white/70 text-xs sm:text-sm mb-0.5">검사/진료</div>
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
                <span className="text-white text-xl sm:text-2xl font-bold flex-1">{nextAction}</span>
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

        {/* 하단 영역 - 흰색 배경 (2/3) */}
        <div className="flex-1 bg-white px-4 sm:px-6 lg:px-8 py-4 -mt-6 rounded-t-3xl relative shadow-xl overflow-y-auto">
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
                    {/* 현재 위치와 목적지 정보 */}
                    {taggedLocation && (
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm">
                        <span className="text-gray-500">현재 위치:</span>
                        <span className="font-medium text-gray-700">
                          {taggedLocation.description || `${taggedLocation.building} ${taggedLocation.floor}층`}
                        </span>
                        <span className="text-gray-400 ml-auto mr-2">→</span>
                        <span className="font-semibold text-blue-600">
                          {locationInfo.name}
                        </span>
                      </div>
                    )}
                    
                    {/* 목적지 정보 - 현재 위치 -> 목적지 형식 */}
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                      <div className="flex items-center justify-center text-sm sm:text-base">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">현재:</span>
                          <span className="font-medium text-gray-800">
                            {taggedLocation?.description || taggedLocation?.building || '현재 위치'}
                          </span>
                        </div>
                        <span className="text-gray-400 mx-4">→</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">목적지:</span>
                          <span className="font-semibold text-blue-700">
                            {locationInfo.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 지도 표시 영역 */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
                  {taggedLocation ? (
                    <div>
                      {/* 지도 헤더 제거 - 위의 목적지 정보로 통합됨 */}
                      
                      {/* [NAVIGATION-COMPONENT] 실시간 지도 컴포넌트 */}
                      <div className="p-6">
                        <div className="bg-gray-50 rounded-xl p-8 border-2 border-dashed border-gray-300 text-center">
                          <div className="text-5xl mb-3">🗺️</div>
                          <p className="text-gray-600 font-medium">[NAVIGATION-COMPONENT]</p>
                          <p className="text-sm text-gray-500 mt-2">
                            실시간 길찾기 지도
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="text-5xl mb-4">📍</div>
                      <p className="text-lg text-gray-700 font-medium mb-2">
                        지도를 보려면 NFC 스티커를 찍어주세요
                      </p>
                      <p className="text-sm text-gray-500">
                        병원 곳곳에 있는 파란색 NFC 스티커를 찾아보세요
                      </p>
                    </div>
                  )}
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
                            <p className="text-sm text-blue-700">{schedule.purpose}</p>
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
                    병원 곳곳의 NFC 스티커에 휴대폰을 대보세요
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
    </div>
  );
};

export default FormatATemplate;