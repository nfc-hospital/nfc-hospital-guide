import React, { useState } from 'react';
import { ChevronDownIcon, MapPinIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import useJourneyStore from '../../store/journeyStore';
import MapNavigator from '../MapNavigator';

/**
 * UnifiedJourneyTemplate - 심미적으로 완전히 재디자인된 통합 레이아웃
 */
const UnifiedJourneyTemplate = ({ header }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const hasInitialized = React.useRef(false);

  // Store에서 데이터 가져오기
  const todaysAppointments = useJourneyStore(state => state.todaysAppointments);
  const locationInfo = useJourneyStore(state => state.locationInfo);
  const currentQueues = useJourneyStore(state => state.currentQueues);

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

  // 초기 렌더링 시 현재 진행 중인 카드 열기
  React.useEffect(() => {
    if (!hasInitialized.current && currentIndex !== -1) {
      setExpandedIndex(currentIndex);
      hasInitialized.current = true;
    }
  }, [currentIndex]);

  const toggleCard = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // 완료된 일정 개수
  const completedCount = scheduleItems.filter(s => s.status === 'completed').length;
  const progressPercentage = scheduleItems.length > 0 ? (completedCount / scheduleItems.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
      {/* Header */}
      {header}

      {/* 진행률 히어로 섹션 - 단순화 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        {/* 배경 장식 */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-32 w-80 h-80 bg-blue-400 rounded-full blur-3xl" />
        </div>

        <div className="relative px-6 py-12 max-w-6xl mx-auto text-center">
          <p className="text-white/70 text-base font-medium mb-4">오늘의 진행 상황</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-white text-7xl font-black">{completedCount}</span>
            <span className="text-white/60 text-5xl font-bold">/ {scheduleItems.length}</span>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        {scheduleItems.length > 0 ? (
          scheduleItems.map((schedule, index) => {
            const isExpanded = expandedIndex === index;
            const isCurrent = index === currentIndex;
            const isCompleted = schedule.status === 'completed';
            const isPending = !isCompleted && !isCurrent;

            return (
              <div
                key={schedule.id}
                className={`group relative rounded-3xl overflow-hidden transition-all duration-500 bg-white ${
                  isCurrent
                    ? 'shadow-2xl shadow-blue-500/30 scale-[1.02] border-4 border-blue-600'
                    : isCompleted
                    ? 'shadow-lg hover:shadow-xl border-2 border-gray-200'
                    : 'shadow-md hover:shadow-lg border-2 border-gray-200'
                }`}
              >
                {/* 카드 헤더 */}
                <button
                  onClick={() => toggleCard(index)}
                  className={`w-full p-6 flex items-center gap-5 transition-all duration-300 ${
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
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md'
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
                      <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold">
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
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div
                    className={`border-t ${
                      isCurrent ? 'border-white/20' : 'border-gray-200'
                    }`}
                  >
                    <div className={`p-6 space-y-5`}>
                      {/* 현재 진행 중일 때만 위치 안내와 대기 정보 */}
                      {isCurrent && (
                        <>
                          {/* 위치 안내 카드 - 토글 가능 */}
                          {locationInfo && (
                            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 shadow-lg">
                              {/* 헤더 - 클릭하여 지도 토글 */}
                              <button
                                onClick={() => setIsMapExpanded(!isMapExpanded)}
                                className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <MapPinIcon className="w-6 h-6 text-blue-600" />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="text-blue-900 font-bold text-xl">위치 안내</h4>
                                    <p className="text-blue-700 text-sm font-medium">
                                      {isMapExpanded ? '지도 숨기기' : '지도 보기'}
                                    </p>
                                  </div>
                                </div>
                                <ChevronDownIcon
                                  className={`w-6 h-6 text-blue-600 transition-transform duration-300 ${
                                    isMapExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>

                              {/* 위치 이름 */}
                              <p className="text-blue-900 text-2xl font-black mb-4">
                                {locationInfo.name || locationInfo.room || schedule.location}
                              </p>

                              {/* 지도 - 토글 */}
                              <div
                                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                  isMapExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                              >
                                <div className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ height: '400px' }}>
                                  <MapNavigator
                                    mapId={locationInfo.mapId || 'main_1f'}
                                    highlightRoom={locationInfo.room || ''}
                                    facilityName={schedule.examName}
                                    multiFloor={false}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 대기 정보 카드 */}
                          {waitingInfo && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <UserGroupIcon className="w-5 h-5 text-amber-600" />
                                  <p className="text-amber-600 text-sm font-medium">내 앞에</p>
                                </div>
                                <p className="text-amber-900 text-4xl font-black">
                                  {waitingInfo.peopleAhead}
                                  <span className="text-xl font-bold ml-2">명</span>
                                </p>
                              </div>
                              <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-200 shadow-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <ClockIcon className="w-5 h-5 text-indigo-600" />
                                  <p className="text-indigo-600 text-sm font-medium">예상 대기</p>
                                </div>
                                <p className="text-indigo-900 text-4xl font-black">
                                  {waitingInfo.estimatedTime}
                                  <span className="text-xl font-bold ml-2">분</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* 검사 설명 - 모든 카드 */}
                      <div
                        className={`rounded-xl p-5 ${
                          isCurrent
                            ? 'bg-blue-50 border border-blue-200'
                            : isCompleted
                            ? 'bg-green-50 border border-green-100'
                            : 'bg-blue-50 border border-blue-100'
                        }`}
                      >
                        <h5
                          className={`text-sm font-bold mb-2 uppercase tracking-wide ${
                            isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-blue-900'
                          }`}
                        >
                          검사 목적
                        </h5>
                        <p
                          className={`text-base leading-relaxed ${
                            isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-blue-700'
                          }`}
                        >
                          {schedule.description || '건강 상태 확인 및 진단'}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl p-5 ${
                          isCurrent
                            ? 'bg-gray-50 border border-gray-200'
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
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
            );
          })
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📅</span>
            </div>
            <p className="text-gray-500 text-xl font-medium">오늘 예정된 검사가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedJourneyTemplate;
