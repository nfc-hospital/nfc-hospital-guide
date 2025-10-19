import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MapPinIcon, ClockIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import useJourneyStore from '../../store/journeyStore';
import useLocationStore from '../../store/locationStore';
import MapNavigator from '../MapNavigator';

/**
 * UnifiedJourneyTemplate - 스냅 스크롤 애니메이션이 적용된 통합 레이아웃
 */
const UnifiedJourneyTemplate = () => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [isExamInfoExpanded, setIsExamInfoExpanded] = useState(false);
  const [searchButtonPosition, setSearchButtonPosition] = useState(20); // 하단 위치 (px)
  const hasInitialized = useRef(false);
  const cardRefs = useRef([]);
  const scrollContainerRef = useRef(null);

  // Store에서 데이터 가져오기
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);
  const locationInfo = useJourneyStore(state => state.locationInfo);
  const currentQueues = useJourneyStore(state => state.currentQueues);
  const currentLocation = useJourneyStore(state => state.currentLocation);
  const taggedLocationInfo = useJourneyStore(state => state.taggedLocationInfo);
  const patientState = useJourneyStore(state => state.patientState);
  const calledModalMinimized = useJourneyStore(state => state.calledModalMinimized);

  // locationStore에서도 위치 정보 가져오기
  const locationStoreData = useLocationStore(state => state.currentLocation);

  // 일정 데이터 변환 (접수/수납 포함)
  const scheduleItems = React.useMemo(() => {
    const journey = [];

    // 1. 접수 단계 추가 (ARRIVED 또는 이후 상태)
    if (patientState && ['ARRIVED', 'REGISTERED', 'WAITING', 'CALLED', 'IN_PROGRESS', 'PAYMENT', 'FINISHED'].includes(patientState)) {
      journey.push({
        id: 'registration',
        examName: '접수',
        location: '본관 1층 원무과',
        status: patientState === 'ARRIVED' ? 'waiting' : 'completed',
        description: '병원 접수 및 환자 등록 절차',
        duration: 5,
        exam: {
          exam_id: 'reception',
          title: '접수',
          department: '원무과',
          building: '본관',
          floor: '1',
          room: '접수창구',
          location: {
            building: '본관',
            floor: '1',
            room: '접수창구'
          }
        }
      });
    }

    // 2. 검사/진료 일정 추가
    if (todaysAppointments && todaysAppointments.length > 0) {
      const examSchedules = todaysAppointments.map((apt, index) => {
        const locationObj = apt.exam?.location;
        let location = '위치 미정';

        if (locationObj && (locationObj.building || locationObj.floor || locationObj.room)) {
          const parts = [];
          if (locationObj.building) parts.push(locationObj.building);
          // 🔧 이미 "층"으로 끝나면 그대로, 아니면 "층" 붙이기
          if (locationObj.floor) {
            const floorStr = locationObj.floor.toString();
            parts.push(floorStr.endsWith('층') ? floorStr : `${floorStr}층`);
          }
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

      journey.push(...examSchedules);
    }

    // 3. 수납 단계 추가 (ARRIVED 이후 모든 상태)
    if (patientState && ['ARRIVED', 'REGISTERED', 'WAITING', 'CALLED', 'IN_PROGRESS', 'PAYMENT', 'FINISHED'].includes(patientState)) {
      journey.push({
        id: 'payment',
        examName: '수납',
        location: '본관 1층 수납창구',
        status: patientState === 'FINISHED' ? 'completed' :
                patientState === 'PAYMENT' ? 'waiting' :
                'pending',
        description: '진료비 및 검사비 수납',
        duration: 5,
        exam: {
          exam_id: 'payment_desk',
          title: '수납',
          department: '원무과',
          building: '본관',
          floor: '1',
          room: '수납창구',
          location: {
            building: '본관',
            floor: '1',
            room: '수납창구'
          }
        }
      });
    }

    return journey;
  }, [todaysAppointments, patientState]);

  // 실제 현재 위치 (우선순위: NFC 태그 > journeyStore.currentLocation > locationStore.currentLocation)
  const actualCurrentLocation = React.useMemo(() => {
    const location = taggedLocationInfo || currentLocation || locationStoreData;

    if (!location) return null;

    console.log('📍 actualCurrentLocation 계산:', {
      taggedLocationInfo,
      currentLocation,
      locationStoreData,
      selected: location
    });

    return location;
  }, [taggedLocationInfo, currentLocation, locationStoreData]);

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

  // 현재 진행 중인 일정 인덱스 (patientState 기반)
  const currentIndex = React.useMemo(() => {
    // 1. patientState 기반으로 진행 중인 카드 찾기
    if (patientState) {
      // ARRIVED: 접수 카드
      if (patientState === 'ARRIVED') {
        const regIndex = scheduleItems.findIndex(s => s.id === 'registration');
        if (regIndex !== -1) return regIndex;
      }

      // REGISTERED, WAITING, CALLED, IN_PROGRESS: 검사/진료 카드 중 waiting/called/in_progress 상태인 것
      if (['REGISTERED', 'WAITING', 'CALLED', 'IN_PROGRESS'].includes(patientState)) {
        const examIndex = scheduleItems.findIndex(s =>
          s.id !== 'registration' &&
          s.id !== 'payment' &&
          ['waiting', 'called', 'in_progress'].includes(s.status)
        );
        if (examIndex !== -1) return examIndex;
      }

      // PAYMENT: 수납 카드
      if (patientState === 'PAYMENT') {
        const paymentIndex = scheduleItems.findIndex(s => s.id === 'payment');
        if (paymentIndex !== -1) return paymentIndex;
      }
    }

    // 2. 백업: 기존 로직 (status만 보기)
    return scheduleItems.findIndex(s =>
      ['waiting', 'called', 'in_progress'].includes(s.status)
    );
  }, [scheduleItems, patientState]);

  // 정확한 padding 계산 (vh 대신 실제 컨테이너 높이 사용)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updatePadding = () => {
      const containerHeight = container.clientHeight;
      const visualCenterPosition = containerHeight * 0.35;

      container.style.paddingTop = `50px`; // 진행 중 카드 헤더가 보이도록 padding 제거
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
    if (!hasInitialized.current && currentIndex !== -1 && scheduleItems.length > 0) {
      setExpandedIndex(currentIndex);
      hasInitialized.current = true;

      // 현재 카드로 즉시 스크롤 (애니메이션 없이)
      setTimeout(() => {
        const currentCard = cardRefs.current[currentIndex];
        const container = scrollContainerRef.current;

        if (currentCard && container) {
          const cardRect = currentCard.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          // 카드 상단이 화면 최상단에 오도록 (헤더가 완전히 보이게)
          const targetScrollTop =
            container.scrollTop +
            cardRect.top -
            containerRect.top +
            10; // 상단에서 10px 아래 여유 공간

          container.scrollTo({
            top: targetScrollTop,
            behavior: 'auto' // 즉시 스크롤
          });
        }
      }, 200);
    }
  }, [currentIndex, scheduleItems.length]);

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

  // CalledModal이 최소화되면 "다른 장소 찾기" 버튼을 위로 이동
  useEffect(() => {
    if (calledModalMinimized) {
      // 알림바(bottom: 16px, 높이: ~60px) + 여유 공간(24px) = 100px 위로 이동
      setSearchButtonPosition(100);
    } else {
      // 원래 위치로 복원
      setSearchButtonPosition(20);
    }
  }, [calledModalMinimized]);

  // 완료된 일정 개수
  const completedCount = scheduleItems.filter(s => s.status === 'completed').length;
  const progressPercentage = scheduleItems.length > 0 ? (completedCount / scheduleItems.length) * 100 : 0;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
      {/* 상단: Progress Bar (고정) */}
      <div className="flex-shrink-0 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium mb-1">오늘 일정</span>
            <span className="text-base font-bold text-gray-800">
              {new Date().toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-500 font-medium mb-1">진행 상황</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-blue-600">{completedCount}</span>
                <span className="text-lg text-gray-400 font-bold">/</span>
                <span className="text-2xl font-bold text-gray-600">{scheduleItems.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 중간: 카드 덱 스크롤 영역 (flex-1) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative hide-scrollbar"
        style={{
          scrollSnapType: 'y proximity', // mandatory → proximity로 부드럽게
          scrollPaddingTop: '0px',
          scrollPaddingBottom: '65%',
        }}
      >
        {scheduleItems.length > 0 ? (
          scheduleItems.map((schedule, index) => {
            const isExpanded = expandedIndex === index;
            const isCurrent = index === currentIndex;
            // currentIndex보다 앞에 있는 카드는 모두 완료 처리
            const isCompleted = schedule.status === 'completed' || (currentIndex !== -1 && index < currentIndex);
            const isPending = !isCompleted && !isCurrent;

            return (
              // 카드 래퍼 - border와 shadow를 위한 충분한 여백
              <div
                key={schedule.id}
                className="flex items-center justify-center py-3 px-2"
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
                  className={`w-full max-w-6xl mx-auto group relative rounded-3xl bg-white overflow-hidden ${
                    isCurrent
                      ? 'shadow-2xl shadow-blue-500/30 border-2 border-blue-600'
                      : isCompleted
                      ? 'shadow-lg hover:shadow-xl border border-gray-300'
                      : 'shadow-md hover:shadow-lg border border-gray-300'
                  }`}
                >
                {/* 카드 헤더 */}
                <button
                  onClick={() => toggleCard(index)}
                  className={`w-full p-5 flex items-center gap-4 transition-all duration-300 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* 상태 아이콘/번호 */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl transition-all duration-500 ${
                        isCurrent
                          ? 'bg-emerald-400 text-white shadow-lg shadow-emerald-500/40 scale-110'
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
                      <div className="absolute inset-0 bg-emerald-400 rounded-2xl animate-ping opacity-20" />
                    )}
                  </div>

                  {/* 일정 정보 */}
                  <div className="flex-1 text-left">
                    <h3
                      className={`text-2xl font-bold mb-2 ${
                        isCurrent ? 'text-white' : isCompleted ? 'text-gray-700' : 'text-gray-900'
                      }`}
                    >
                      {schedule.examName}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-2 ${
                        isCurrent ? 'text-white/90' : 'text-gray-500'
                      }`}>
                        <MapPinIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">{schedule.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* 상태 뱃지 & 펼침 아이콘 */}
                  <div className="flex items-center gap-3">
                    {isCompleted && (
                      <span className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-full text-base font-bold">
                        완료
                      </span>
                    )}
                    {isCurrent && (
                      <span className="px-5 py-2.5 bg-emerald-500 text-white rounded-full text-base font-bold shadow-lg">
                        진행 중
                      </span>
                    )}
                    <ChevronDownIcon
                      className={`w-8 h-8 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      } ${isCurrent ? 'text-white' : 'text-gray-400'}`}
                    />
                  </div>
                </button>

                {/* 카드 상세 내용 */}
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div
                    className={`border-t ${
                      isCurrent ? 'border-white/20' : 'border-gray-200'
                    }`}
                  >
                    <div className={`p-5 space-y-3`}>
                      {/* 현재 진행 중일 때만 위치 안내와 대기 정보 */}
                      {isCurrent && (
                        <>
                          {/* 1. 대기 정보 */}
                          {waitingInfo && (
                            <div className="grid grid-cols-2 gap-3">
                              {/* 내 앞에 */}
                              <div className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-300 shadow-lg">
                                <div className="flex flex-col items-center justify-center">
                                  <p className="text-blue-700 text-sm font-medium mb-2">내 앞에</p>
                                  <p className="flex items-baseline">
                                    <span className="text-blue-600 text-4xl font-black">{waitingInfo.peopleAhead}</span>
                                    <span className="text-blue-700 text-base font-bold ml-1.5">명</span>
                                  </p>
                                </div>
                              </div>

                              {/* 예상 대기 */}
                              <div className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-300 shadow-lg">
                                <div className="flex flex-col items-center justify-center">
                                  <p className="text-blue-700 text-sm font-medium mb-2">예상 대기</p>
                                  <p className="flex items-baseline">
                                    <span className="text-blue-600 text-4xl font-black">{waitingInfo.estimatedTime}</span>
                                    <span className="text-blue-700 text-base font-bold ml-1.5">분</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. 지도 */}
                          {(locationInfo || schedule.exam) && (
                            <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-lg">
                              {/* 헤더: 출발→도착 + 토글 버튼 */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
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

                                {/* 출발 → 도착 */}
                                <div className="flex items-center gap-2 text-base">
                                  <span className="text-gray-600 font-medium">현재 위치</span>
                                  <span className="font-bold text-gray-800">
                                    {(() => {
                                      if (actualCurrentLocation?.description) {
                                        return actualCurrentLocation.description;
                                      }
                                      if (actualCurrentLocation) {
                                        const parts = [];
                                        if (actualCurrentLocation.building) parts.push(actualCurrentLocation.building);
                                        // 🔧 이미 "층"으로 끝나면 그대로, 아니면 "층" 붙이기
                                        if (actualCurrentLocation.floor) {
                                          const floorStr = actualCurrentLocation.floor.toString();
                                          parts.push(floorStr.endsWith('층') ? floorStr : `${floorStr}층`);
                                        }
                                        if (actualCurrentLocation.room) parts.push(actualCurrentLocation.room);
                                        if (parts.length > 0) return parts.join(' ');
                                      }
                                      return '미확인';
                                    })()}
                                  </span>
                                  <span className="text-blue-600 mx-1 text-lg">→</span>
                                  <span className="text-gray-600 font-medium">도착지</span>
                                  <span className="font-bold text-blue-700">
                                    {(() => {
                                      // locationInfo가 있으면 building + floor + room 조합
                                      if (locationInfo) {
                                        if (locationInfo.name) {
                                          return locationInfo.name;
                                        }
                                        const parts = [];
                                        if (locationInfo.building) parts.push(locationInfo.building);
                                        // 🔧 이미 "층"으로 끝나면 그대로, 아니면 "층" 붙이기
                                        if (locationInfo.floor) {
                                          const floorStr = locationInfo.floor.toString();
                                          parts.push(floorStr.endsWith('층') ? floorStr : `${floorStr}층`);
                                        }
                                        if (locationInfo.room) parts.push(locationInfo.room);
                                        if (parts.length > 0) return parts.join(' ');
                                      }
                                      // locationInfo가 없으면 schedule.location 사용
                                      return schedule.location;
                                    })()}
                                  </span>
                                </div>
                              </div>

                              {/* 지도 - 토글 */}
                              <div
                                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                  isMapExpanded ? 'max-h-[450px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                              >
                                {/* FormatATemplate의 지도 부분 그대로 */}
                                <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                                  <div className="p-6">
                                    <MapNavigator
                                      mapId={locationInfo?.mapFile?.replace('.svg', '') || 'main_1f'}
                                      highlightRoom={locationInfo?.name || ''}
                                      facilityName={locationInfo?.name || ''}
                                      multiFloor={false}
                                      startFloor="main_1f"
                                      endFloor={locationInfo?.mapFile?.replace('.svg', '') || 'main_2f'}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* 검사 정보 - 토글 가능 */}
                      <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-lg">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-gray-900 font-bold text-base flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            검사 설명
                          </h4>
                          <button
                            onClick={() => setIsExamInfoExpanded(!isExamInfoExpanded)}
                            className="text-sm text-blue-600 flex items-center gap-1 font-medium hover:text-blue-800 transition-colors"
                          >
                            <ChevronDownIcon
                              className={`w-4 h-4 transition-transform duration-300 ${
                                isExamInfoExpanded ? 'rotate-180' : ''
                              }`}
                            />
                            {isExamInfoExpanded ? '접기' : '펼치기'}
                          </button>
                        </div>

                        {/* 토글 가능한 내용 */}
                        <div
                          className={`overflow-hidden transition-all duration-500 ease-in-out ${
                            isExamInfoExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="space-y-3 pt-2">
                            {/* 검사 목적 */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                </div>
                                <span className="text-sm font-semibold text-gray-700">검사 목적</span>
                              </div>
                              <p className="text-base text-gray-900 leading-relaxed ml-8">
                                {schedule.description || '건강 상태 확인 및 진단을 위한 검사입니다.'}
                              </p>
                            </div>

                            {/* 소요 시간 */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <span className="text-sm font-semibold text-gray-700">소요 시간</span>
                              </div>
                              <p className="text-base text-gray-900 ml-8">
                                약 <span className="font-bold text-blue-600">{schedule.duration}분</span> 소요
                              </p>
                            </div>
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

      {/* 플로팅: 다른 장소 찾기 버튼 (왼쪽 하단) */}
      <button
        className="fixed left-5 z-[9999] px-6 py-4 bg-white border-2 border-gray-300 rounded-full shadow-2xl hover:shadow-3xl hover:bg-gray-50 hover:border-gray-400 active:scale-95 flex items-center justify-center gap-2 font-bold text-gray-700"
        style={{
          minWidth: '200px',
          height: '56px',
          bottom: `${searchButtonPosition}px`,
          transition: 'bottom 300ms ease-in-out'
        }}
      >
        <MagnifyingGlassIcon className="w-6 h-6 text-blue-600" />
        다른 장소 찾기
      </button>
    </div>
  );
};

export default UnifiedJourneyTemplate;
