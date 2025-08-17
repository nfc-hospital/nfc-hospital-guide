import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import QueueStatus from '../journey/QueueStatus';
import ProgressBar from '../journey/ProgressBar';
import UnifiedHeader from '../common/UnifiedHeader';
import MapModal from '../common/MapModal';
import SlideNavigation from '../common/SlideNavigation';
import { useRealtimeQueues } from '../../hooks/useRealtimeQueues';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import CurrentTaskCard from '../journey/CurrentTaskCard';
import UpcomingTasksCard from '../journey/UpcomingTasksCard';
import AppointmentList from '../journey/AppointmentList';
import { calculateNFCDistance, getDestinationByState, getInitialSlideIndex, generateNavigationKeywords } from '../../utils/nfcLocation';

export default function WaitingScreen({ taggedLocation, current_task, upcoming_tasks }) {
  // 기본값으로 빈 배열을 설정하여 'find' 오류를 방지
  const { user, currentQueues = [], todaysAppointments = [] } = useJourneyStore();
  
  // 디버깅 로그 추가
  console.log('🔍 WaitingScreen props:');
  console.log('  - current_task:', current_task);
  console.log('  - upcoming_tasks:', upcoming_tasks);
  console.log('  - todaysAppointments:', todaysAppointments);
  console.log('  - currentQueues:', currentQueues);
  const [showPreparation, setShowPreparation] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState('main_1f');
  const { refresh } = useRealtimeQueues(true);

  // 현재 대기 중인 큐 찾기 - currentQueues가 undefined여도 안전
  const activeQueue = currentQueues.find(
    q => q.state === 'waiting' || q.state === 'ongoing'
  );

  // 진행 중인 검사 찾기 - todaysAppointments가 undefined여도 안전
  const ongoingAppointment = todaysAppointments.find(
    apt => apt.status === 'ongoing'
  );

  const currentExam = ongoingAppointment || activeQueue;
  const isOngoing = user?.state === 'ONGOING' || activeQueue?.state === 'ongoing';

  // NFC 위치 판별 및 슬라이드 설정 - 안전한 처리
  const destination = getDestinationByState('WAITING', currentExam?.exam) || {
    building: '본관',
    floor: '1',
    room: '접수처',
    department: '일반',
    description: '병원 안내'
  };
  const locationInfo = taggedLocation ? calculateNFCDistance(taggedLocation, destination) : { isNearby: false };
  const initialSlide = getInitialSlideIndex(locationInfo?.isNearby || false);
  const navigationKeywords = generateNavigationKeywords(taggedLocation, destination);

  // 현재 검사 정보 enrichment
  const enrichedCurrentTask = current_task;
  const currentAppointment = currentExam;
  const upcomingAppointments = upcoming_tasks;

  // 테스트용 경로 데이터 (층별) - 실제 복도를 따라가는 현실적인 경로
  const testPaths = {
    // 본관 1층: 정문 → 메인 복도 → 진단검사의학과 → 채혈실
    'main_1f': 'M 450 80 L 450 150 L 480 150 L 480 165 L 550 165 L 550 180 L 680 180 L 680 165',
    // 본관 2층: 엘리베이터 홀 → 중앙 복도 → 내과 진료실
    'main_2f': 'M 450 140 L 450 200 L 380 200 L 380 240 L 320 240 L 320 290 L 215 290',
    // 암센터 1층: 로비 → 복도 → 방사선종양학과
    'cancer_1f': 'M 450 350 L 450 300 L 520 300 L 520 270 L 600 270 L 600 250 L 740 250',
    // 암센터 2층: 엘리베이터 → 중앙 복도 → 항암치료실
    'cancer_2f': 'M 150 140 L 250 140 L 250 200 L 300 200 L 300 270 L 450 270 L 450 250 L 560 250'
  };

  // 층 정보
  const floorMaps = {
    'main_1f': '/images/maps/main_1f.interactive.svg',
    'main_2f': '/images/maps/main_2f.interactive.svg',
    'cancer_1f': '/images/maps/cancer_1f.interactive.svg',
    'cancer_2f': '/images/maps/cancer_2f.interactive.svg'
  };

  // 검사실 위치에 따라 적절한 층과 경로 선택
  const getMapInfoForExam = () => {
    if (!currentExam?.exam) {
      return { floor: 'main_1f', path: testPaths['main_1f'] };
    }
    
    const building = currentExam.exam.building;
    const floor = currentExam.exam.floor;
    
    let floorKey = 'main_1f';
    if (building?.includes('암센터')) {
      floorKey = floor === '2' ? 'cancer_2f' : 'cancer_1f';
    } else {
      floorKey = floor === '2' ? 'main_2f' : 'main_1f';
    }
    
    return { floor: floorKey, path: testPaths[floorKey] };
  };

  useEffect(() => {
    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="text-center">
            <div className="mb-3">
              <span className="text-5xl">{isOngoing ? '🏥' : '⏳'}</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isOngoing ? '검사가 진행 중입니다' : '대기 중입니다'}
            </h1>
            <p className="text-xl text-blue-100 font-medium">
              {user?.name}님, {isOngoing ? '잠시만 기다려주세요' : '곧 호출해드리겠습니다'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 통합 헤더 */}
        <UnifiedHeader currentState="WAITING" />

        <div className="h-[calc(100vh-200px)]">
          <SlideNavigation 
            defaultSlide={initialSlide}
            showDots={true}
          >
            {/* 슬라이드 1: 대기 상태 및 준비사항 */}
            <div className="h-full overflow-y-auto py-8 space-y-8">

            {/* NFC 태그 위치에 따른 맞춤형 안내 */}
            {taggedLocation && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg transition-all duration-300 ease-in-out">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl 
                              flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">📍</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-semibold text-gray-900 mb-2">
                      현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}
                    </p>
                    <p className="text-lg text-gray-700 leading-relaxed">
                      {locationInfo.isNearby 
                        ? `✅ 검사실 근처에 계십니다. 대기 번호가 호출될 때까지 잠시만 기다려주세요.`
                        : '📍 검사실까지의 길찾기는 다음 화면에서 확인하세요.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 대기/진행 상태 카드 */}
            {activeQueue && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 transition-all duration-300 ease-in-out hover:shadow-xl">
                <QueueStatus queue={activeQueue} />
              </div>
            )}

            {/* 현재 진행 중인 작업 카드 */}
            {enrichedCurrentTask ? (
              <CurrentTaskCard appointment={enrichedCurrentTask} />
            ) : currentAppointment && (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 transition-all duration-300 ease-in-out hover:shadow-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {isOngoing ? '🏥 현재 진행 중인 검사' : '📋 다음 검사 정보'}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl 
                                flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl">🏥</span>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-gray-900">
                        {currentAppointment.exam?.title || '검사'}
                      </p>
                      <p className="text-lg text-gray-600">
                        {currentAppointment.exam?.building} {currentAppointment.exam?.floor}층 {currentAppointment.exam?.room}
                      </p>
                    </div>
                  </div>

                  {!isOngoing && (
                    <button
                      onClick={() => setShowPreparation(!showPreparation)}
                      className="w-full bg-blue-50 text-blue-800 border-2 border-blue-200 rounded-xl py-4 px-8
                               text-xl font-semibold hover:bg-blue-100 transition-all duration-300 ease-in-out
                               flex items-center justify-between group min-h-[56px]"
                    >
                      <span>검사 준비사항 확인</span>
                      <svg 
                        className={`w-6 h-6 transition-transform duration-300 
                                  ${showPreparation ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}

                  {showPreparation && (
                    <div className="mt-4 p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
                      <h4 className="text-xl font-semibold text-amber-800 mb-3">⚠️ 준비사항</h4>
                      <ul className="space-y-3 text-lg text-amber-800">
                        <li className="flex items-start gap-3">
                          <span className="text-xl">📌</span>
                          <span>검사 전 8시간 금식이 필요합니다</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-xl">💊</span>
                          <span>복용 중인 약이 있다면 의료진에게 알려주세요</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 진행 중일 때 다음 검사 안내 섹션 */}
            {isOngoing && upcomingAppointments && upcomingAppointments.length > 0 && (
              <div className="bg-blue-50 rounded-2xl shadow-lg p-6 border-2 border-blue-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">📌 다음 검사 안내</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-14 h-14 bg-blue-100 rounded-xl 
                                  flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🏥</span>
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-gray-900">
                          {upcomingAppointments[0].exam?.title || '다음 검사'}
                        </p>
                        <p className="text-lg text-gray-600">
                          예정 시간: {format(new Date(upcomingAppointments[0].scheduled_at), 'HH:mm', { locale: ko })}
                        </p>
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <p className="text-lg text-amber-800 font-medium leading-relaxed">
                        💡 현재 검사가 끝나면 {upcomingAppointments[0].exam?.building} {upcomingAppointments[0].exam?.floor}층 {upcomingAppointments[0].exam?.room}으로 이동해주세요
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 예정된 작업 카드 - 대기 중일 때만 표시 */}
            {!isOngoing && upcomingAppointments && upcomingAppointments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 transition-all duration-300 ease-in-out hover:shadow-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">📅 오늘의 남은 일정</h3>
                <UpcomingTasksCard appointments={upcomingAppointments} />
              </div>
            )}

            {/* 오늘의 전체 검사 목록 - 진행 중일 때 표시 */}
            {isOngoing && todaysAppointments && todaysAppointments.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-200">
                <h3 className="text-3xl font-bold text-gray-900 mb-6">📋 오늘의 전체 검사</h3>
                <AppointmentList 
                  appointments={todaysAppointments}
                  currentAppointmentId={currentAppointment?.appointment_id}
                />
              </div>
            )}

            {/* 자리 비움 기능 */}
            {!isOngoing && activeQueue && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-900">내 차례에 알림 받기</h3>
                    <p className="text-xl text-yellow-800 mt-2">
                      호출 시 알림을 보내드립니다
                    </p>
                  </div>
                  <button className="bg-yellow-600 text-white px-8 py-4 rounded-2xl text-xl font-bold
                                   hover:bg-yellow-700 transition-all duration-200 shadow-lg hover:shadow-xl
                                   min-w-[160px]">
                    알림 설정
                  </button>
                </div>
              </div>
            )}

            {/* 새로고침 버튼 */}
            <button 
              onClick={refresh}
              className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-3xl py-6
                       text-xl font-bold hover:from-gray-200 hover:to-gray-300 transition-all duration-200
                       flex items-center justify-center gap-3 shadow-lg hover:shadow-xl min-h-[80px]"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              대기 상태 새로고침
            </button>
          </div>

          {/* 슬라이드 2: 지도 및 길찾기 */}
          <div className="h-full overflow-y-auto py-8 space-y-8">
            <h2 className="text-4xl font-bold text-gray-900 text-center mb-8">
              검사실 위치 안내
            </h2>

            {/* [NAVIGATION-COMPONENT] 지도 컴포넌트가 들어갈 자리 */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                [NAVIGATION-COMPONENT]
              </h3>
              <p className="text-gray-600 mb-4">
                실시간 병원 지도 컴포넌트가 여기에 표시됩니다
              </p>
              
              {destination && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-600 mb-1">검사실</p>
                  <p className="text-lg font-bold text-blue-900">
                    {destination.building} {destination.floor}층 {destination.room}
                  </p>
                  <p className="text-blue-700">{destination.description}</p>
                </div>
              )}

              {taggedLocation && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-600 mb-1">현재 위치</p>
                  <p className="text-lg font-bold text-green-900">
                    {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}
                  </p>
                </div>
              )}

              {/* [NAVIGATION-API] 검색 키워드 표시 */}
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
                <p className="font-mono text-gray-600">
                  {navigationKeywords.apiKeyword}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  API 검색: {navigationKeywords.searchParams.from} → {navigationKeywords.searchParams.to}
                </p>
              </div>
            </div>

            {/* 대기 중 이용 가능한 옵션들 */}
            {!isOngoing && (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    // TODO: [NAVIGATION-API] 화장실 길안내 API 연동 필요
                  }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
                             hover:shadow-md transition-all duration-300 text-left group">
                  <span className="text-3xl">🚻</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 
                               group-hover:text-blue-600 transition-colors">
                    화장실 위치
                  </h3>
                  <p className="text-gray-600 mt-1">가장 가까운 화장실 안내</p>
                </button>
                
                <button 
                  onClick={() => {
                    // TODO: [NAVIGATION-API] 편의시설 길안내 API 연동 필요
                  }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
                             hover:shadow-md transition-all duration-300 text-left group">
                  <span className="text-3xl">☕</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-2 
                               group-hover:text-blue-600 transition-colors">
                    편의시설
                  </h3>
                  <p className="text-gray-600 mt-1">카페, 편의점 위치</p>
                </button>
              </div>
            )}
          </div>
        </SlideNavigation>
        </div>
      </div>

      {/* 지도 모달 */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        mapUrl={floorMaps[selectedFloor]}
        pathData={testPaths[selectedFloor]}
        title={`검사실 위치 - ${enrichedCurrentTask?.exam?.title || '병원 지도'}`}
      />
    </div>
  );
}