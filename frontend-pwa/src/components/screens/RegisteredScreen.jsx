import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import Lottie from 'lottie-react';
import AppointmentList from '../journey/AppointmentList';
import ProgressBar from '../journey/ProgressBar';
// import SimpleProgressBar from '../journey/SimpleProgressBar';
import Modal from '../common/Modal';
import MapModal from '../common/MapModal';
import SlideNavigation from '../common/SlideNavigation';
import { format, differenceInMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import CurrentTaskCard from '../journey/CurrentTaskCard';
import UpcomingTasksCard from '../journey/UpcomingTasksCard';
import { calculateNFCDistance, getDestinationByState, getInitialSlideIndex, generateNavigationKeywords } from '../../utils/nfcLocation';
import UnifiedHeader from '../common/UnifiedHeader';

// Lottie 애니메이션 데이터 (체크마크)
const checkmarkAnimation = {
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 120,
  w: 200,
  h: 200,
  nm: "Success",
  ddd: 0,
  assets: [],
  layers: [{
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: "Check",
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [100, 100, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [
        { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 20, s: [0, 0, 100] },
        { t: 40, s: [100, 100, 100] }
      ] }
    },
    shapes: [{
      ty: "gr",
      it: [
        {
          ind: 0,
          ty: "sh",
          ks: {
            a: 0,
            k: {
              i: [[0, 0], [0, 0], [0, 0]],
              o: [[0, 0], [0, 0], [0, 0]],
              v: [[-30, 0], [-10, 20], [30, -20]],
              c: false
            }
          }
        },
        {
          ty: "st",
          c: { a: 0, k: [0.122, 0.467, 0.878, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 8 },
          lc: 2,
          lj: 2
        }
      ]
    }]
  }]
};

export default function RegisteredScreen({ taggedLocation, current_task, upcoming_tasks }) {
  const navigate = useNavigate();
  const { user, todaysAppointments, currentQueues = [] } = useJourneyStore();
  
  // WaitingScreen처럼 journeyStore 데이터 우선 사용
  // 현재 대기 중인 큐 찾기
  const activeQueue = currentQueues.find(
    q => q.state === 'waiting' || q.state === 'ongoing'
  );
  
  // todaysAppointments에서 현재 진행중인 검사 찾기
  const currentFromAppointments = todaysAppointments?.find(apt => 
    ['waiting', 'called', 'ongoing'].includes(apt.status)
  );
  
  // props보다 journeyStore 데이터를 우선시
  const actualCurrentTask = currentFromAppointments || activeQueue || current_task;
  
  // 예정된 작업들 찾기
  const upcomingFromAppointments = todaysAppointments?.filter(apt => 
    apt.status === 'scheduled' || apt.status === 'pending'
  ) || [];
  
  const actualUpcomingTasks = upcomingFromAppointments.length > 0 ? upcomingFromAppointments : 
    (upcoming_tasks || []);
  
  // journeyStore의 데이터를 우선 사용
  const displayCurrentTask = actualCurrentTask;
  const displayUpcomingTasks = actualUpcomingTasks;
  
  // 디버깅 로그
  console.log('🔍 RegisteredScreen 데이터:');
  console.log('  - todaysAppointments:', todaysAppointments);
  console.log('  - displayCurrentTask:', displayCurrentTask);
  console.log('  - displayUpcomingTasks:', displayUpcomingTasks);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAnimation, setShowAnimation] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationAppointment, setLocationAppointment] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  
  // 다음 검사 찾기
  const nextAppointment = todaysAppointments?.find(apt => 
    apt.status === 'pending' || apt.status === 'waiting'
  ) || current_task;

  // NFC 위치 판별 및 슬라이드 설정
  const nextExam = displayCurrentTask?.exam || displayUpcomingTasks?.[0]?.exam || todaysAppointments?.[0]?.exam;
  const destination = getDestinationByState('REGISTERED', nextExam) || {
    building: '본관',
    floor: '1',
    room: '접수처',
    department: '일반',
    description: '병원 안내'
  };
  const locationInfo = taggedLocation ? calculateNFCDistance(taggedLocation, destination) : { isNearby: false };
  const initialSlide = getInitialSlideIndex(locationInfo?.isNearby || false);
  const navigationKeywords = generateNavigationKeywords(taggedLocation, destination);

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getTimeUntilFirst = () => {
    if (!todaysAppointments || todaysAppointments.length === 0) return null;
    
    const sortedAppointments = [...todaysAppointments].sort(
      (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
    );
    
    const firstAppointment = sortedAppointments[0];
    const now = new Date();
    const scheduledTime = new Date(firstAppointment.scheduled_at);
    const minutes = differenceInMinutes(scheduledTime, now);
    
    if (minutes < 0) return '지금 바로';
    if (minutes < 60) return `${minutes}분 후`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}시간 ${mins}분 후` : `${hours}시간 후`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-20">
      {showAnimation && (
        <div className="fixed inset-0 bg-gradient-to-br from-green-100 to-blue-100 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-6 animate-bounce-slow">
              <div className="w-48 h-48 mx-auto bg-gradient-to-br from-green-100 to-green-200 
                           rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-8xl">✅</span>
              </div>
            </div>
            <h1 className="text-5xl font-extrabold text-green-700 mb-4">
              접수가 완료되었습니다!
            </h1>
            <p className="text-3xl text-gray-700 font-semibold">
              {user?.name}님, 오늘 진료 잘 받으세요
            </p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-500 to-green-500 shadow-xl">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                안녕하세요, {user?.name}님
              </h1>
              <p className="text-2xl text-blue-100 font-medium">
                오늘의 검사 일정을 확인하세요
              </p>
            </div>
            <div className="text-center bg-white/20 backdrop-blur-sm rounded-3xl p-6">
              <p className="text-lg text-blue-100 mb-1">첫 검사까지</p>
              <p className="text-4xl font-extrabold text-white">
                {getTimeUntilFirst() || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 통합 헤더 - 현재 상태와 진행률 표시 */}
        <UnifiedHeader currentState="REGISTERED" />

        <div className="h-[calc(100vh-200px)]">
          <SlideNavigation 
            defaultSlide={initialSlide}
            showDots={true}
          >
            {/* 슬라이드 1: 검사 준비사항 및 안내 */}
            <div className="h-full overflow-y-auto py-8 space-y-8">
              {/* NFC 태그 위치에 따른 맞춤형 안내 */}
              {taggedLocation && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-3xl p-8 animate-fade-in shadow-lg">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-200 to-green-300 rounded-2xl 
                                flex items-center justify-center flex-shrink-0 shadow-lg">
                      <span className="text-3xl">📍</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-green-900 mb-3">
                        현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}
                      </p>
                      <p className="text-xl text-green-700 leading-relaxed">
                        {locationInfo.isNearby 
                          ? '✅ 검사실 근처에 계십니다. 준비사항을 확인해주세요.'
                          : '📍 위치 정보를 확인했습니다. 검사실 길찾기를 위해 다음 화면을 확인하세요.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-8 shadow-lg">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-200 to-blue-300 rounded-2xl 
                              flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-3xl">ℹ️</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-3">오늘의 안내</h3>
                    <p className="text-xl text-blue-800 leading-relaxed">
                      각 검사 시간 10분 전까지 해당 검사실 앞에서 대기해주세요.
                      검사 준비사항은 아래에서 확인하실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

            {/* 디버깅: 데이터 확인 */}
            {console.log('🎯 렌더링 시점 - displayCurrentTask:', displayCurrentTask)}
            {console.log('🎯 렌더링 시점 - displayUpcomingTasks:', displayUpcomingTasks)}
            
            {/* 현재 진행할 작업 카드 */}
            {displayCurrentTask ? (
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  지금 해야 할 일
                </h2>
                <CurrentTaskCard appointment={displayCurrentTask} />
              </div>
            ) : (
              <div className="mb-8 p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-600">현재 진행할 작업이 없습니다.</p>
              </div>
            )}

            {/* 예정된 작업 카드 */}
            {displayUpcomingTasks && displayUpcomingTasks.length > 0 ? (
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  오늘의 남은 일정
                </h2>
                <UpcomingTasksCard appointments={displayUpcomingTasks} />
              </div>
            ) : (
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-600">예정된 작업이 없습니다.</p>
              </div>
            )}
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
                  <p className="text-sm text-blue-600 mb-1">목적지</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button 
                onClick={() => navigate('/my-exams')}
                className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 p-8 
                           hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 text-left group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-200 to-blue-300 rounded-2xl 
                            flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-3xl">📋</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 
                             group-hover:text-blue-600 transition-colors">
                  내 검사 목록
                </h3>
                <p className="text-lg text-gray-600">모든 검사 내역 보기</p>
              </button>
              
              <button 
                onClick={() => setIsMapModalOpen(true)}
                className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 p-8 
                           hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 text-left group">
                <div className="w-16 h-16 bg-gradient-to-br from-green-200 to-green-300 rounded-2xl 
                            flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-3xl">🗺️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 
                             group-hover:text-blue-600 transition-colors">
                  병원 전체 지도
                </h3>
                <p className="text-lg text-gray-600">다른 시설 위치 보기</p>
              </button>
            </div>
          </div>
        </SlideNavigation>
        </div>
      </div>

      <Modal
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        title={selectedAppointment?.exam?.title || '검사 상세 정보'}
        size="lg"
      >
        {selectedAppointment && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                검사 정보
              </h3>
              <div className="space-y-2 text-gray-700">
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  예약 시간: {format(new Date(selectedAppointment.scheduled_at), 'HH:mm', { locale: ko })}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  위치: {selectedAppointment.exam?.building} {selectedAppointment.exam?.floor}층 {selectedAppointment.exam?.room}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  소요 시간: 약 {selectedAppointment.exam?.average_duration || 30}분
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                검사 준비사항
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-medium text-amber-900">금식 필요</p>
                    <p className="text-amber-800 text-sm mt-1">
                      검사 8시간 전부터 물을 포함한 모든 음식 섭취를 금지해주세요.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-2xl">💊</span>
                  <div>
                    <p className="font-medium text-blue-900">복용 중인 약</p>
                    <p className="text-blue-800 text-sm mt-1">
                      평소 복용하시는 약이 있다면 의료진에게 알려주세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setLocationAppointment(selectedAppointment);
                  setShowLocationModal(true);
                  setSelectedAppointment(null);
                  // TODO: [NAVIGATION-API] 검사실 길안내 API 연동 필요
                }}
                className="flex-1 bg-green-600 text-white rounded-xl py-4 text-lg font-semibold
                         hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                검사실 위치 보기
              </button>
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="flex-1 bg-blue-600 text-white rounded-xl py-4 text-lg font-semibold
                         hover:bg-blue-700 transition-colors duration-200"
              >
                확인했습니다
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 검사실 위치 정보 모달 */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="검사실 위치 안내"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🏥</span>
              <div>
                <h3 className="text-xl font-bold text-blue-900">
                  {locationAppointment?.exam?.title || '검사실'}
                </h3>
                <p className="text-lg text-blue-700">
                  {locationAppointment?.exam?.building} {locationAppointment?.exam?.floor}층 {locationAppointment?.exam?.room}
                </p>
              </div>
            </div>
            
            {/* TODO: [NAVIGATION-COMPONENT] 실시간 길안내 컴포넌트로 교체 필요 */}
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <p className="text-gray-700">현재 위치에서 엘리베이터로 이동</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <p className="text-gray-700">
                  {locationAppointment?.exam?.floor}층에서 하차
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <p className="text-gray-700">
                  복도를 따라 {locationAppointment?.exam?.room}호로 이동
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-medium text-amber-900">도움이 필요하신가요?</p>
                <p className="text-amber-800 text-sm mt-1">
                  각 층 엘리베이터 앞에 있는 안내 데스크에서 도움을 받으실 수 있습니다.
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowLocationModal(false)}
            className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-semibold
                     hover:bg-blue-700 transition-colors duration-200"
          >
            확인했습니다
          </button>
        </div>
      </Modal>

      {/* 병원 지도 모달 */}
      <MapModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        appointment={null} // 일반 지도 탐색을 위해 appointment 비활성화
        mapConfig={{
          // 본관 1층 설정
          '본관 1층': {
            url: '/images/maps/main_1f.interactive.svg',
            viewBox: '0 0 900 600',
            nodes: {
              entrance_main: { x: 450, y: 80 },
              door_emergency: { x: 220, y: 280 },
              door_lab: { x: 500, y: 200 },
              door_blood: { x: 700, y: 200 },
              door_convenience: { x: 570, y: 280 },
              door_cafe: { x: 570, y: 360 },
              door_bank: { x: 680, y: 280 },
              corridor_main_1: { x: 180, y: 240 },
              corridor_main_2: { x: 250, y: 240 },
              corridor_main_3: { x: 320, y: 240 },
              corridor_main_4: { x: 380, y: 240 },
              corridor_main_5: { x: 450, y: 240 },
              corridor_main_6: { x: 500, y: 240 },
              corridor_main_7: { x: 570, y: 240 },
              corridor_main_8: { x: 640, y: 240 },
              corridor_main_9: { x: 700, y: 240 },
              corridor_north_1: { x: 450, y: 160 },
              corridor_north_2: { x: 450, y: 120 },
              bypass_north: { x: 450, y: 180 },
              bypass_east_1: { x: 750, y: 240 },
              bypass_east_2: { x: 750, y: 180 },
            },
            paths: {
              '정문 → 채혈실': [
                'entrance_main',
                'corridor_north_2',
                'corridor_north_1',
                'bypass_north',
                'bypass_east_2',
                'bypass_east_1',
                'corridor_main_9',
                'door_blood',
              ],
              '정문 → 진단검사의학과': [
                'entrance_main',
                'corridor_north_2',
                'corridor_north_1',
                'corridor_main_5',
                'corridor_main_6',
                'door_lab',
              ],
              '정문 → 응급센터': [
                'entrance_main',
                'corridor_north_2',
                'corridor_north_1',
                'corridor_main_5',
                'corridor_main_4',
                'corridor_main_3',
                'corridor_main_2',
                'door_emergency',
              ],
              '정문 → 편의점': [
                'entrance_main',
                'corridor_north_2',
                'corridor_north_1',
                'corridor_main_5',
                'corridor_main_6',
                'corridor_main_7',
                'door_convenience',
              ],
              '정문 → 카페': [
                'entrance_main',
                'corridor_north_2',
                'corridor_north_1',
                'corridor_main_5',
                'corridor_main_6',
                'corridor_main_7',
                'door_cafe',
              ],
              '정문 → 은행': [
                'entrance_main',
                'corridor_north_2',
                'corridor_north_1',
                'corridor_main_5',
                'corridor_main_6',
                'corridor_main_7',
                'corridor_main_8',
                'door_bank',
              ],
            }
          },
          // 본관 2층 설정
          '본관 2층': {
            url: '/images/maps/main_2f.interactive.svg',
            viewBox: '0 0 900 600',
            nodes: {
              elevator: { x: 450, y: 300 },
              door_internal: { x: 650, y: 200 },
              door_surgery: { x: 250, y: 200 },
              door_orthopedic: { x: 450, y: 200 },
              door_pediatric: { x: 450, y: 100 },
              corridor_main: { x: 450, y: 250 },
              corridor_east: { x: 600, y: 250 },
              corridor_west: { x: 300, y: 250 },
              corridor_north: { x: 450, y: 150 },
            },
            paths: {
              '엘리베이터 → 내과': [
                'elevator',
                'corridor_main',
                'corridor_east',
                'door_internal',
              ],
              '엘리베이터 → 외과': [
                'elevator',
                'corridor_main',
                'corridor_west',
                'door_surgery',
              ],
              '엘리베이터 → 정형외과': [
                'elevator',
                'corridor_main',
                'door_orthopedic',
              ],
              '엘리베이터 → 소아청소년과': [
                'elevator',
                'corridor_main',
                'corridor_north',
                'door_pediatric',
              ],
            }
          },
          // 암센터 1층 설정
          '암센터 1층': {
            url: '/images/maps/cancer_1f.interactive.svg',
            viewBox: '0 0 900 600',
            nodes: {
              entrance_cancer: { x: 450, y: 500 },
              door_oncology: { x: 650, y: 300 },
              door_chemo: { x: 450, y: 300 },
              door_consult: { x: 250, y: 300 },
              corridor_main: { x: 450, y: 400 },
              corridor_east: { x: 600, y: 400 },
              corridor_west: { x: 300, y: 400 },
            },
            paths: {
              '암센터입구 → 종양내과': [
                'entrance_cancer',
                'corridor_main',
                'corridor_east',
                'door_oncology',
              ],
              '암센터입구 → 항암치료실': [
                'entrance_cancer',
                'corridor_main',
                'door_chemo',
              ],
              '암센터입구 → 상담실': [
                'entrance_cancer',
                'corridor_main',
                'corridor_west',
                'door_consult',
              ],
            }
          },
          // 암센터 2층 설정
          '암센터 2층': {
            url: '/images/maps/cancer_2f.interactive.svg',
            viewBox: '0 0 900 600',
            nodes: {
              entrance_cancer: { x: 450, y: 80 },
              door_ct: { x: 360, y: 270 },
              door_mri: { x: 560, y: 270 },
              door_xray: { x: 145, y: 435 },
              corridor_main: { x: 450, y: 350 },
              corridor_west: { x: 250, y: 350 },
              corridor_east: { x: 650, y: 350 },
            },
            paths: {
              '입구 → CT실': [
                'entrance_cancer',
                'corridor_main',
                'corridor_west',
                'door_ct',
              ],
              '입구 → MRI실': [
                'entrance_cancer',
                'corridor_main',
                'corridor_east',
                'door_mri',
              ],
              '입구 → X-ray실': [
                'entrance_cancer',
                'corridor_main',
                'corridor_west',
                'door_xray',
              ],
            }
          }
        }}
        destinations={[
          // 본관 1층 시설
          { 
            label: '채혈실',
            pathName: '정문 → 채혈실',
            icon: '💉',
            description: '본관 1층 동쪽',
            floor: '본관 1층'
          },
          { 
            label: '진단검사의학과',
            pathName: '정문 → 진단검사의학과',
            icon: '🔬',
            description: '본관 1층 중앙',
            floor: '본관 1층'
          },
          { 
            label: '응급센터',
            pathName: '정문 → 응급센터',
            icon: '🚨',
            description: '본관 1층 서쪽',
            floor: '본관 1층'
          },
          { 
            label: '편의점',
            pathName: '정문 → 편의점',
            icon: '🏪',
            description: '편의시설 구역',
            floor: '본관 1층'
          },
          { 
            label: '카페',
            pathName: '정문 → 카페',
            icon: '☕',
            description: '편의시설 구역',
            floor: '본관 1층'
          },
          { 
            label: '은행',
            pathName: '정문 → 은행',
            icon: '🏦',
            description: '편의시설 구역',
            floor: '본관 1층'
          },
          // 본관 2층 시설
          { 
            label: '내과',
            pathName: '엘리베이터 → 내과',
            icon: '🩺',
            description: '본관 2층 동쪽',
            floor: '본관 2층'
          },
          { 
            label: '외과',
            pathName: '엘리베이터 → 외과',
            icon: '🏥',
            description: '본관 2층 서쪽',
            floor: '본관 2층'
          },
          { 
            label: '정형외과',
            pathName: '엘리베이터 → 정형외과',
            icon: '🦴',
            description: '본관 2층 중앙',
            floor: '본관 2층'
          },
          { 
            label: '소아청소년과',
            pathName: '엘리베이터 → 소아청소년과',
            icon: '👶',
            description: '본관 2층 북쪽',
            floor: '본관 2층'
          },
          // 암센터 1층 시설
          { 
            label: '종양내과',
            pathName: '암센터입구 → 종양내과',
            icon: '🏥',
            description: '암센터 1층 동쪽',
            floor: '암센터 1층'
          },
          { 
            label: '항암치료실',
            pathName: '암센터입구 → 항암치료실',
            icon: '💊',
            description: '암센터 1층 중앙',
            floor: '암센터 1층'
          },
          { 
            label: '상담실',
            pathName: '암센터입구 → 상담실',
            icon: '💬',
            description: '암센터 1층 서쪽',
            floor: '암센터 1층'
          },
          // 암센터 2층 시설
          { 
            label: 'CT실',
            pathName: '입구 → CT실',
            icon: '🔍',
            description: '암센터 2층 중앙',
            floor: '암센터 2층'
          },
          { 
            label: 'MRI실',
            pathName: '입구 → MRI실',
            icon: '🧲',
            description: '암센터 2층 동쪽',
            floor: '암센터 2층'
          },
          { 
            label: 'X-ray실',
            pathName: '입구 → X-ray실',
            icon: '📷',
            description: '암센터 2층 서쪽',
            floor: '암센터 2층'
          },
        ]}
        title="병원 길찾기"
      />
    </div>
  );
}