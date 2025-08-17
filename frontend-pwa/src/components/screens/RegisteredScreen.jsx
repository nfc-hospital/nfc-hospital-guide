import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import Modal from '../common/Modal';
import MapModal from '../common/MapModal';
import SlideNavigation from '../common/SlideNavigation';
import { format, differenceInMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import Lottie from 'lottie-react';
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
          ty: "sh",
          d: 1,
          ks: {
            a: 0,
            k: {
              i: [[0, 0], [0, 0], [0, 0]],
              o: [[0, 0], [0, 0], [0, 0]],
              v: [[-50, 0], [-20, 30], [50, -40]],
              c: false
            }
          }
        },
        {
          ty: "st",
          c: { a: 0, k: [0.2, 0.6, 1, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 12 },
          lc: 2,
          lj: 2,
          ml: 4,
          bm: 0
        },
        {
          ty: "tr",
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
          sk: { a: 0, k: 0 },
          sa: { a: 0, k: 0 }
        }
      ]
    }],
    trim: {
      ty: "tm",
      s: { a: 0, k: 0 },
      e: { a: 1, k: [
        { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] }, t: 25, s: [0] },
        { t: 45, s: [100] }
      ] },
      o: { a: 0, k: 0 },
      m: 1
    }
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
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // 다음 검사 찾기
  const nextAppointment = todaysAppointments?.find(apt => 
    apt.status === 'pending' || apt.status === 'waiting'
  ) || current_task;



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

  // 슬라이드 정의
  const slides = [
    { id: 'schedule', title: '오늘 일정' },
    { id: 'actions', title: '추가 메뉴' }
  ];
  
  // 모달 상태 추가
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [locationAppointment, setLocationAppointment] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const totalSlides = slides.length;
  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

  const goToPrevSlide = () => {
    if (canGoPrev) setCurrentSlide(currentSlide - 1);
  };

  const goToNextSlide = () => {
    if (canGoNext) setCurrentSlide(currentSlide + 1);
  };

  const [showWelcome, setShowWelcome] = useState(true);
  
  // 3초 후 자동으로 슬라이드로 이동
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 relative">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 통합 헤더 - 등록 상태 표시 */}
        <UnifiedHeader currentState="REGISTERED" />
      </div>
      
      {showWelcome ? (
        /* 환영 화면 */
        <div className="h-[calc(100vh-200px)] flex flex-col justify-center px-6">
          <div className="text-center">
            {/* Lottie 애니메이션 */}
            <div className="mb-8">
              <div className="w-48 h-48 mx-auto">
                <Lottie 
                  animationData={checkmarkAnimation}
                  loop={false}
                  autoplay={true}
                />
              </div>
            </div>
            
            {/* 메인 메시지 */}
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
              접수가 완료되었습니다
            </h1>
            <p className="text-3xl text-gray-700">
              {user?.name}님, 안녕하세요
            </p>
            
            <button
              onClick={() => setShowWelcome(false)}
              className="mt-12 text-blue-600 text-xl hover:text-blue-800 transition-colors"
            >
              계속하기 →
            </button>
          </div>
        </div>
      ) : (
        /* 슬라이드 네비게이션 */
        <div className="h-[calc(100vh-200px)] flex flex-col">
          <SlideNavigation 
            defaultSlide={0}
            showDots={true}
          >
            {/* 슬라이드 1: 오늘의 일정 */}
          <div className="h-full flex flex-col px-6 py-8 overflow-y-auto">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 text-center mb-6">
              오늘의 검사 일정
            </h2>
            
            {/* 첫 검사 시간 */}
            {getTimeUntilFirst() && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-3xl p-6 mb-8 mx-auto shadow-lg">
                <p className="text-xl text-blue-800 font-medium text-center">
                  첫 검사까지 <span className="font-bold text-2xl text-blue-900">{getTimeUntilFirst()}</span>
                </p>
              </div>
            )}
            
            {/* 현재 진행할 검사 */}
            {displayCurrentTask ? (
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center gap-3">
                  <span className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></span>
                  지금 해야 할 일
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-3xl p-8 shadow-lg 
                             border-2 border-blue-200 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-6 mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl 
                                flex items-center justify-center shadow-lg">
                      <span className="text-white text-3xl font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-gray-900 mb-2">{displayCurrentTask.exam?.title}</p>
                      <p className="text-xl text-gray-700">
                        <span className="text-blue-600 font-semibold">
                          {displayCurrentTask.exam?.building} {displayCurrentTask.exam?.floor}층 {displayCurrentTask.exam?.room}
                        </span>
                      </p>
                    </div>
                  </div>
                  {displayCurrentTask.scheduled_at && (
                    <div className="bg-white/70 rounded-2xl px-6 py-3 inline-block">
                      <p className="text-xl text-blue-800 font-medium">
                        예약 시간: <span className="font-bold text-2xl">
                          {format(new Date(displayCurrentTask.scheduled_at), 'HH:mm', { locale: ko })}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-8 bg-gray-100 rounded-3xl p-8 text-center">
                <p className="text-xl text-gray-600">현재 진행할 검사가 없습니다</p>
              </div>
            )}
            
            {/* 예정된 검사 목록 */}
            {displayUpcomingTasks && displayUpcomingTasks.length > 0 && (
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-gray-700 mb-6">다음 일정</h3>
                <div className="space-y-5">
                  {displayUpcomingTasks.slice(0, 3).map((task, index) => (
                    <div key={task.appointment_id || index} 
                         className="bg-white rounded-3xl p-7 shadow-lg hover:shadow-xl 
                                  border border-gray-200 transition-all duration-300 
                                  transform hover:scale-[1.02]">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 
                                    rounded-2xl flex items-center justify-center shadow-md">
                          <span className="text-gray-700 text-2xl font-bold">{index + 2}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xl font-semibold text-gray-900 mb-1">{task.exam?.title}</p>
                          <p className="text-lg text-gray-600">
                            {task.scheduled_at && format(new Date(task.scheduled_at), 'HH:mm', { locale: ko })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 슬라이드 2: 추가 메뉴 */}
          <div className="h-full flex flex-col justify-center px-6">
            <div className="max-w-2xl mx-auto w-full">
              <h2 className="text-4xl font-bold text-gray-900 mb-10 text-center">
                추가 메뉴
              </h2>
              
              <div className="space-y-6">
                {/* 검사 목록 보기 버튼 */}
                <button 
                  onClick={() => navigate('/my-exams')}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white 
                           rounded-3xl py-8 px-10 text-2xl font-bold shadow-2xl
                           hover:shadow-3xl hover:from-blue-700 hover:to-blue-800 
                           transform hover:scale-[1.03] transition-all duration-300
                           flex items-center justify-center gap-4"
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  검사 목록 보기
                </button>
                
                {/* 병원 전체 지도 버튼 */}
                <button 
                  onClick={() => setIsMapModalOpen(true)}
                  className="w-full bg-white border-3 border-blue-300 text-blue-700 
                           rounded-3xl py-8 px-10 text-2xl font-bold shadow-lg
                           hover:shadow-2xl hover:border-blue-500 hover:bg-blue-50
                           transform hover:scale-[1.03] transition-all duration-300
                           flex items-center justify-center gap-4"
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  병원 전체 지도 보기
                </button>
                
                {/* 도움말 */}
                <div className="bg-gray-100 rounded-2xl p-6 mt-8">
                  <p className="text-xl text-gray-700 text-center">
                    도움이 필요하시면 <span className="font-semibold text-blue-600">안내 데스크</span>에 문의하세요
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SlideNavigation>
        </div>
      )}

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