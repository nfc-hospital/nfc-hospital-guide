import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MapPinIcon, ClockIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import useJourneyStore from '../../store/journeyStore';
import MapNavigator from '../MapNavigator';

/**
 * UnifiedJourneyTemplate - 스냅 스크롤 애니메이션이 적용된 통합 레이아웃
 */
const UnifiedJourneyTemplate = () => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const hasInitialized = useRef(false);
  const cardRefs = useRef([]);
  const scrollContainerRef = useRef(null);

  // Store에서 데이터 가져오기
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);
  const locationInfo = useJourneyStore(state => state.locationInfo);
  const currentQueues = useJourneyStore(state => state.currentQueues);
  const currentLocation = useJourneyStore(state => state.currentLocation);
  const taggedLocationInfo = useJourneyStore(state => state.taggedLocationInfo);

  // 일정 데이터 변환
  const scheduleItems = React.useMemo(() => {
    if (!todaysAppointments) return [];

    return todaysAppointments.map((apt, index) => {
      const locationObj = apt.exam?.location;
      let location = '위치 미정';

      if (locationObj && (locationObj.building || locationObj.floor || locationObj.room)) {
        const parts = [];
        if (locationObj.building) parts.push(locationObj.building);
        if (locationObj.floor) parts.push(`${locationObj.floor}층`);
        if (locationObj.room) parts.push(locationObj.room);
        location = parts.join(' ');
      } else if (apt.exam?.department) {
        location = apt.exam.department;
      }

      return {
        id: apt.appointment_id,
        examName: apt.exam?.title || `검사 ${index + 1}`,
        location: location,
        status: apt.status,
        description: apt.exam?.description,
        duration: apt.exam?.average_duration || 30,
        exam: apt.exam
      };
    });
  }, [todaysAppointments]);

  // 실제 현재 위치 (NFC 태그 > currentLocation 우선순위)
  const actualCurrentLocation = React.useMemo(() => {
    return taggedLocationInfo || currentLocation;
  }, [taggedLocationInfo, currentLocation]);

  // 대기 정보
  const waitingInfo = React.useMemo(() => {
    const activeQueue = currentQueues?.find(
      q => q.state === 'waiting' || q.state === 'called' || q.state === 'in_progress'
    );

    if (activeQueue) {
      return {
        peopleAhead: activeQueue.queue_number > 0 ? activeQueue.queue_number - 1 : 0,
        estimatedTime: activeQueue.estimated_wait_time || 15,
        queueNumber: activeQueue.queue_number || 1
      };
    }
    return null;
  }, [currentQueues]);

  // 현재 진행 중인 일정 인덱스
  const currentIndex = React.useMemo(() => {
    return scheduleItems.findIndex(s =>
      ['waiting', 'called', 'in_progress'].includes(s.status)
    );
  }, [scheduleItems]);

  // 정확한 padding 계산 (vh 대신 실제 컨테이너 높이 사용)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updatePadding = () => {
      const containerHeight = container.clientHeight;
      const visualCenterPosition = containerHeight * 0.35;

      container.style.paddingTop = `${visualCenterPosition}px`;
      container.style.paddingBottom = `${containerHeight - visualCenterPosition}px`;
    };

    updatePadding();
    window.addEventListener('resize', updatePadding);

    return () => {
      window.removeEventListener('resize', updatePadding);
    };
  }, []);

  // 초기 렌더링 시 현재 진행 중인 카드 열기 + 스크롤
  useEffect(() => {
    if (!hasInitialized.current && currentIndex !== -1) {
      setExpandedIndex(currentIndex);
      hasInitialized.current = true;

      // 현재 카드로 부드럽게 스크롤
      setTimeout(() => {
        const currentCard = cardRefs.current[currentIndex];
        if (currentCard && scrollContainerRef.current) {
          currentCard.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
    }
  }, [currentIndex]);

  // 컨테이너 기반 스크롤 스타일 계산 - 유희왕 카드 덱 방식
  const [cardStyles, setCardStyles] = useState({});
  const rafIdRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const calculateStyles = () => {
      const containerRect = container.getBoundingClientRect();

      // 시각적 중앙 = 실제 중앙보다 위쪽 (상단 헤더를 고려)
      // 컨테이너 높이의 35% 지점을 시각적 중앙으로 사용
      const visualCenterY = containerRect.top + containerRect.height * 0.35;
      const newStyles = {};

      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        const cardRect = card.getBoundingClientRect();
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const distanceFromCenter = Math.abs(cardCenterY - visualCenterY);

        // 정규화: 컨테이너 높이의 절반 대신 40%를 기준으로
        const normalizedDistance = distanceFromCenter / (containerRect.height * 0.4);

        // 거리에 따라 점진적으로 작아지게 (더 부드럽게)
        const scale = Math.max(0.92, 1.0 - normalizedDistance * 0.08); // 1.0 ~ 0.92
        const opacity = Math.max(0.85, 1 - normalizedDistance * 0.15); // 1 ~ 0.85

        // 중앙 카드는 블러 없이, 멀어질수록 최소한만
        const blur = normalizedDistance < 0.2 ? 0 : Math.min(normalizedDistance * 0.3, 0.4);

        newStyles[index] = {
          transform: `scale(${scale})`,
          opacity: opacity,
          filter: `blur(${blur}px)`,
        };
      });

      setCardStyles(newStyles);
      rafIdRef.current = null;
    };

    // RAF throttle로 성능 최적화
    const handleScroll = () => {
      if (rafIdRef.current !== null) return; // 이미 예약된 RAF가 있으면 건너뛰기

      rafIdRef.current = requestAnimationFrame(calculateStyles);
    };

    calculateStyles();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [scheduleItems.length]);

  const toggleCard = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // 완료된 일정 개수
  const completedCount = scheduleItems.filter(s => s.status === 'completed').length;
  const progressPercentage = scheduleItems.length > 0 ? (completedCount / scheduleItems.length) * 100 : 0;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
      {/* 상단: Progress Bar (고정) */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 text-center">
          <div className="text-3xl font-black text-blue-600">
            {completedCount}
            <span className="text-gray-400 text-2xl"> / {scheduleItems.length}</span>
          </div>
        </div>
      </div>

      {/* 중간: 카드 덱 스크롤 영역 (flex-1) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative hide-scrollbar"
        style={{
          scrollSnapType: 'y proximity', // mandatory → proximity로 부드럽게
          scrollPaddingTop: '35%',
          scrollPaddingBottom: '65%',
        }}
      >
        {scheduleItems.length > 0 ? (
          scheduleItems.map((schedule, index) => {
            const isExpanded = expandedIndex === index;
            const isCurrent = index === currentIndex;
            const isCompleted = schedule.status === 'completed';
            const isPending = !isCompleted && !isCurrent;

            return (
              // 카드 래퍼 - border와 shadow를 위한 충분한 여백
              <div
                key={schedule.id}
                className="flex items-center justify-center py-5 px-2"
                style={{
                  scrollSnapAlign: 'center',
                  scrollSnapStop: 'normal',
                }}
              >
                <div
                  ref={(el) => (cardRefs.current[index] = el)}
                  data-index={index}
                  style={{
                    ...(cardStyles[index] || {}),
                    willChange: 'transform, opacity, filter',
                  }}
                  className={`w-full max-w-6xl mx-auto px-1 group relative rounded-3xl bg-white ${
                    isCurrent
                      ? 'shadow-2xl shadow-blue-500/30 border-4 border-blue-600'
                      : isCompleted
                      ? 'shadow-lg hover:shadow-xl border-2 border-gray-300'
                      : 'shadow-md hover:shadow-lg border-2 border-gray-300'
                  }`}
                >
                {/* 카드 헤더 */}
                <button
                  onClick={() => toggleCard(index)}
                  className={`w-full p-6 flex items-center gap-5 transition-all duration-300 ${
                    isExpanded ? 'rounded-t-3xl' : 'rounded-3xl'
                  } ${
                    isCurrent
                      ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-900'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* 상태 아이콘/번호 */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl transition-all duration-500 ${
                        isCurrent
                          ? 'bg-amber-400 text-white shadow-lg shadow-amber-500/50 scale-110'
                          : isCompleted
                          ? 'bg-gray-200 text-gray-600 shadow-md'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="w-10 h-10" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    {isCurrent && (
                      <div className="absolute inset-0 bg-amber-400 rounded-2xl animate-ping opacity-30" />
                    )}
                  </div>

                  {/* 일정 정보 */}
                  <div className="flex-1 text-left">
                    <h3
                      className={`text-2xl font-bold mb-1 ${
                        isCurrent ? 'text-white' : isCompleted ? 'text-gray-700' : 'text-gray-900'
                      }`}
                    >
                      {schedule.examName}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 ${
                        isCurrent ? 'text-white/90' : 'text-gray-500'
                      }`}>
                        <MapPinIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{schedule.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* 상태 뱃지 & 펼침 아이콘 */}
                  <div className="flex items-center gap-3">
                    {isCompleted && (
                      <span className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-bold">
                        완료
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-4 py-2 bg-amber-400 text-white rounded-full text-sm font-bold shadow-lg">
                        진행 중
                      </span>
                    )}
                    <ChevronDownIcon
                      className={`w-7 h-7 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      } ${isCurrent ? 'text-white' : 'text-gray-400'}`}
                    />
                  </div>
                </button>

                {/* 카드 상세 내용 */}
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out rounded-b-3xl ${
                    isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div
                    className={`border-t ${
                      isCurrent ? 'border-white/20' : 'border-gray-200'
                    }`}
                  >
                    <div className={`p-3 space-y-2`}>
                      {/* 현재 진행 중일 때만 위치 안내와 대기 정보 */}
                      {isCurrent && (
                        <>
                          {/* 1. 위치 안내 (가로, 3칸 그리드) */}
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-2 border border-blue-200 shadow-lg items-center">
                            {/* 출발 */}
                            <div className="text-right pr-1">
                              <p className="text-gray-500 text-[10px] mb-0.5">출발</p>
                              <p className="text-gray-900 font-bold text-xs leading-tight truncate">
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
                              </p>
                            </div>

                            {/* 화살표 */}
                            <div className="text-blue-600 text-xl px-1">→</div>

                            {/* 도착 */}
                            <div className="text-left pl-1">
                              <p className="text-gray-500 text-[10px] mb-0.5">도착</p>
                              <p className="text-blue-700 font-black text-xs leading-tight truncate">
                                {locationInfo?.name || locationInfo?.room || schedule.location}
                              </p>
                            </div>
                          </div>

                          {/* 2. 대기 정보 (회색, 2칸 그리드) */}
                          {waitingInfo && (
                            <div className="grid grid-cols-2 gap-2">
                              {/* 내 앞에 */}
                              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 shadow-lg">
                                <div className="flex flex-col items-center justify-center">
                                  <p className="text-gray-600 text-xs font-medium mb-1">내 앞에</p>
                                  <p className="text-gray-900 text-3xl font-black">{waitingInfo.peopleAhead}</p>
                                  <p className="text-gray-600 text-sm font-bold">명</p>
                                </div>
                              </div>

                              {/* 예상 대기 */}
                              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 shadow-lg">
                                <div className="flex flex-col items-center justify-center">
                                  <p className="text-gray-600 text-xs font-medium mb-1">예상 대기</p>
                                  <p className="text-gray-900 text-3xl font-black">{waitingInfo.estimatedTime}</p>
                                  <p className="text-gray-600 text-sm font-bold">분</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. 지도 */}
                          {locationInfo && (
                            <div className="bg-blue-50 rounded-2xl p-3 border border-blue-200 shadow-lg">
                              {/* 간단한 토글 버튼 */}
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-blue-900 font-bold text-lg flex items-center gap-2">
                                  <MapPinIcon className="w-5 h-5" />
                                  길 안내
                                </h4>
                                <button
                                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                                  className="text-sm text-blue-600 flex items-center gap-1 font-medium hover:text-blue-800 transition-colors"
                                >
                                  <ChevronDownIcon
                                    className={`w-4 h-4 transition-transform duration-300 ${
                                      isMapExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                  {isMapExpanded ? '지도 접기' : '지도 펼치기'}
                                </button>
                              </div>

                              {/* 지도 - 토글 */}
                              <div
                                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                  isMapExpanded ? 'max-h-[450px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                              >
                                <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                                  <div className="p-3">
                                    <MapNavigator
                                      mapId={locationInfo.mapId || 'main_1f'}
                                      highlightRoom={locationInfo.room || ''}
                                      facilityName={schedule.examName}
                                      multiFloor={false}
                                      startFloor="main_1f"
                                      endFloor={locationInfo.mapId || 'main_2f'}
                                      pathNodes={[]}
                                      pathEdges={[]}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* 검사 설명 + 소요시간 통합 */}
                      <div
                        className={`rounded-xl p-3 ${
                          isCurrent
                            ? 'bg-blue-50 border border-blue-200'
                            : isCompleted
                            ? 'bg-gray-50 border border-gray-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {/* 검사 목적 */}
                          <div>
                            <h5
                              className={`text-sm font-bold mb-2 uppercase tracking-wide ${
                                isCurrent ? 'text-blue-900' : isCompleted ? 'text-gray-700' : 'text-gray-700'
                              }`}
                            >
                              검사 목적
                            </h5>
                            <p
                              className={`text-base leading-relaxed ${
                                isCurrent ? 'text-blue-700' : isCompleted ? 'text-gray-600' : 'text-gray-600'
                              }`}
                            >
                              {schedule.description || '건강 상태 확인 및 진단'}
                            </p>
                          </div>

                          {/* 소요시간 */}
                          <div>
                            <h5
                              className={`text-sm font-bold mb-2 uppercase tracking-wide ${
                                isCurrent ? 'text-gray-900' : 'text-gray-900'
                              }`}
                            >
                              소요시간
                            </h5>
                            <p
                              className={`text-base ${
                                isCurrent ? 'text-gray-700' : 'text-gray-700'
                              }`}
                            >
                              약 <span className="font-bold text-xl">{schedule.duration}</span>분
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            );
          })
        ) : (
          <div className="min-h-full flex items-center justify-center">
            <div className="text-center py-20 bg-white rounded-3xl shadow-lg max-w-6xl mx-4">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📅</span>
              </div>
              <p className="text-gray-500 text-xl font-medium">오늘 예정된 검사가 없습니다</p>
            </div>
          </div>
        )}
      </div>

      {/* 스크롤 인디케이터 */}
      {scheduleItems.length > 1 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 animate-bounce pointer-events-none">
          <div className="bg-blue-600 text-white rounded-full p-2 shadow-xl">
            <ChevronDownIcon className="w-6 h-6" />
          </div>
        </div>
      )}

      {/* 플로팅: 다른 장소 찾기 버튼 (왼쪽 하단) */}
      <button
        className="fixed bottom-5 left-5 z-[9999] px-6 py-4 bg-white border-2 border-gray-300 rounded-full shadow-2xl hover:shadow-3xl hover:bg-gray-50 hover:border-gray-400 active:scale-95 flex items-center justify-center gap-2 font-bold text-gray-700 transition-all duration-300"
        style={{
          minWidth: '200px',
          height: '56px'
        }}
      >
        <MagnifyingGlassIcon className="w-6 h-6" />
        다른 장소 찾기
      </button>
    </div>
  );
};

export default UnifiedJourneyTemplate;
