import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import QueueStatus from '../journey/QueueStatus';
import ProgressBar from '../journey/ProgressBar';
import SimpleProgressBar from '../journey/SimpleProgressBar';
import MapModal from '../common/MapModal';
import SlideNavigation from '../common/SlideNavigation';
import { useRealtimeQueues } from '../../hooks/useRealtimeQueues';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import CurrentTaskCard from '../journey/CurrentTaskCard';
import UpcomingTasksCard from '../journey/UpcomingTasksCard';
import { calculateNFCDistance, getDestinationByState, getInitialSlideIndex, generateNavigationKeywords } from '../../utils/nfcLocation';

export default function WaitingScreen({ taggedLocation, current_task, upcoming_tasks }) {
  // 기본값으로 빈 배열을 설정하여 'find' 오류를 방지
  const { user, currentQueues = [], todaysAppointments = [] } = useJourneyStore();
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

  // NFC 위치 판별 및 슬라이드 설정
  const destination = getDestinationByState('WAITING', currentExam?.exam);
  const locationInfo = taggedLocation ? calculateNFCDistance(taggedLocation, destination) : { isNearby: false };
  const initialSlide = getInitialSlideIndex(locationInfo.isNearby);
  const navigationKeywords = generateNavigationKeywords(taggedLocation, destination);

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
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isOngoing ? '검사가 진행 중입니다' : '대기 중입니다'}
          </h1>
          <p className="text-lg text-gray-600 mt-1">
            {user?.name}님, {isOngoing ? '잠시만 기다려주세요' : '곧 호출해드리겠습니다'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 전체 진행 상황 표시 - 고정 */}
        <div className="mb-4">
          <SimpleProgressBar 
            patientState={user?.state || 'WAITING'} 
            appointments={todaysAppointments}
            showLabel={true}
          />
        </div>

        <div className="h-[calc(100vh-200px)]">
          <SlideNavigation 
            defaultSlide={initialSlide}
            showDots={true}
          >
            {/* 슬라이드 1: 대기 상태 및 준비사항 */}
            <div className="h-full overflow-y-auto py-6 space-y-6">

            {/* NFC 태그 위치에 따른 맞춤형 안내 */}
            {taggedLocation && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📍</span>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900">
                      현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}
                    </p>
                    <p className="text-amber-700 mt-1">
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
              <QueueStatus queue={activeQueue} />
            )}

            {/* 현재 진행 중인 작업 카드 */}
            {current_task ? (
              <CurrentTaskCard appointment={current_task} />
            ) : currentExam && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isOngoing ? '현재 진행 중인 검사' : '다음 검사 정보'}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏥</span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {currentExam.exam?.title || '검사'}
                      </p>
                      <p className="text-gray-600">
                        {currentExam.exam?.building} {currentExam.exam?.floor}층 {currentExam.exam?.room}
                      </p>
                    </div>
                  </div>

                  {!isOngoing && (
                    <button
                      onClick={() => setShowPreparation(!showPreparation)}
                      className="w-full mt-2 bg-blue-50 text-blue-700 rounded-xl py-3 px-4
                               font-medium hover:bg-blue-100 transition-colors duration-200
                               flex items-center justify-between group"
                    >
                      <span>검사 준비사항 확인</span>
                      <svg 
                        className={`w-5 h-5 transition-transform duration-200 
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
                    <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <h4 className="font-medium text-amber-900 mb-2">준비사항</h4>
                      <ul className="space-y-2 text-amber-800">
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>검사 전 8시간 금식이 필요합니다</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>복용 중인 약이 있다면 의료진에게 알려주세요</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 예정된 작업 카드 */}
            {upcoming_tasks && upcoming_tasks.length > 0 && (
              <UpcomingTasksCard appointments={upcoming_tasks} />
            )}

            {/* 자리 비움 기능 */}
            {!isOngoing && activeQueue && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-yellow-900">잠시 자리를 비우시나요?</h3>
                    <p className="text-yellow-800 text-sm mt-1">
                      호출 시 문자로 알려드립니다
                    </p>
                  </div>
                  <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg
                                   hover:bg-yellow-700 transition-colors duration-200">
                    자리 비움
                  </button>
                </div>
              </div>
            )}

            {/* 새로고침 버튼 */}
            <button 
              onClick={refresh}
              className="w-full bg-gray-100 text-gray-700 rounded-xl py-4
                       font-medium hover:bg-gray-200 transition-colors duration-200
                       flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              대기 상태 새로고침
            </button>
          </div>

          {/* 슬라이드 2: 지도 및 길찾기 */}
          <div className="h-full overflow-y-auto py-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
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
        title={`검사실 위치 - ${currentExam?.exam?.title || '병원 지도'}`}
      />
    </div>
  );
}