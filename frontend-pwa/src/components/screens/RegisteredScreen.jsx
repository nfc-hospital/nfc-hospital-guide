import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import Lottie from 'lottie-react';
import AppointmentList from '../journey/AppointmentList';
import ProgressBar from '../journey/ProgressBar';
import SimpleProgressBar from '../journey/SimpleProgressBar';
import Modal from '../common/Modal';
import MapModal from '../common/MapModal';
import { format, differenceInMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import CurrentTaskCard from '../journey/CurrentTaskCard';
import UpcomingTasksCard from '../journey/UpcomingTasksCard';

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
  const { user, todaysAppointments } = useJourneyStore();
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAnimation, setShowAnimation] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationAppointment, setLocationAppointment] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

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
    <div className="min-h-screen bg-gray-50 pb-20">
      {showAnimation && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="text-center">
            <Lottie 
              animationData={checkmarkAnimation} 
              loop={false}
              style={{ width: 200, height: 200 }}
            />
            <h1 className="text-3xl font-bold text-green-600 mt-4">
              접수가 완료되었습니다!
            </h1>
            <p className="text-xl text-gray-600 mt-2">
              {user?.name}님, 오늘 진료 잘 받으세요
            </p>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                안녕하세요, {user?.name}님
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                오늘의 검사 일정을 확인하세요
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">첫 검사까지</p>
              <p className="text-2xl font-bold text-blue-600">
                {getTimeUntilFirst() || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* NFC 태그 위치에 따른 맞춤형 안내 */}
        {taggedLocation && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <p className="font-semibold text-green-900">
                  현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}
                </p>
                {(() => {
                  // 다음 검사 확인
                  const nextAppointment = todaysAppointments?.find(apt => 
                    apt.status === 'pending' || apt.status === 'waiting'
                  );
                  
                  if (nextAppointment?.exam) {
                    const isSameLocation = 
                      taggedLocation.building === nextAppointment.exam.building &&
                      taggedLocation.floor === parseInt(nextAppointment.exam.floor);
                    
                    const timeUntil = differenceInMinutes(
                      new Date(nextAppointment.scheduled_at),
                      new Date()
                    );
                    
                    if (isSameLocation) {
                      return (
                        <p className="text-green-700 mt-1">
                          ✅ 다음 검사실이 같은 층에 있습니다. 
                          {timeUntil > 10 ? `약 ${timeUntil}분 후에 검사가 시작됩니다.` : '곧 검사가 시작됩니다.'}
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-green-700 mt-1">
                          다음 검사는 {nextAppointment.exam.building} {nextAppointment.exam.floor}층에 있습니다.
                          {timeUntil > 20 ? ' 여유롭게 이동하셔도 됩니다.' : ' 곧 이동하셔야 합니다.'}
                        </p>
                      );
                    }
                  } else {
                    return (
                      <p className="text-green-700 mt-1">
                        접수가 완료되었습니다. 검사 일정을 확인해주세요.
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900">오늘의 안내</h3>
              <p className="text-blue-800 mt-1">
                각 검사 시간 10분 전까지 해당 검사실 앞에서 대기해주세요.
                검사 준비사항은 아래 일정을 터치하여 확인하실 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 전체 진행 상황 표시 */}
        <SimpleProgressBar 
          patientState={user?.state || 'REGISTERED'} 
          appointments={todaysAppointments}
          showLabel={true}
        />
        
        {/* 개별 검사 진행 상황 - 선택적 표시 */}
        {todaysAppointments && todaysAppointments.length > 0 && (
          <ProgressBar 
            journeyData={{
              patientState: user?.state || 'REGISTERED',
              appointments: todaysAppointments
            }}
          />
        )}

        {/* 현재 진행할 작업 카드 */}
        {current_task && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              지금 해야 할 일
            </h2>
            <CurrentTaskCard appointment={current_task} />
          </div>
        )}

        {/* 예정된 작업 카드 */}
        {upcoming_tasks && upcoming_tasks.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              오늘의 남은 일정
            </h2>
            <UpcomingTasksCard appointments={upcoming_tasks} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/my-exams')}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
                         hover:shadow-md transition-all duration-300 text-left group">
            <span className="text-3xl">📋</span>
            <h3 className="text-lg font-semibold text-gray-900 mt-2 
                         group-hover:text-blue-600 transition-colors">
              내 검사 목록
            </h3>
            <p className="text-gray-600 mt-1">모든 검사 내역 보기</p>
          </button>
          
          <button 
            onClick={() => setIsMapModalOpen(true)}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
                         hover:shadow-md transition-all duration-300 text-left group">
            <span className="text-3xl">🗺️</span>
            <h3 className="text-lg font-semibold text-gray-900 mt-2 
                         group-hover:text-blue-600 transition-colors">
              병원 지도
            </h3>
            <p className="text-gray-600 mt-1">검사실 위치 미리보기</p>
          </button>
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
        mapConfig={{
          url: '/images/maps/main_1f.interactive.svg',
          viewBox: '0 0 900 600',
          nodes: {
            // 건물 입구
            entrance_main: { x: 450, y: 80 },
            
            // 검사실/시설 입구
            door_emergency: { x: 220, y: 280 },
            door_lab: { x: 500, y: 200 },
            door_blood: { x: 700, y: 200 },
            door_xray: { x: 380, y: 200 },
            door_ct: { x: 320, y: 200 },
            door_donation: { x: 140, y: 430 },
            door_convenience: { x: 570, y: 280 },
            door_cafe: { x: 570, y: 360 },
            door_bank: { x: 680, y: 280 },
            door_pharmacy: { x: 780, y: 280 },
            
            // 메인 복도
            corridor_main_1: { x: 180, y: 240 },
            corridor_main_2: { x: 250, y: 240 },
            corridor_main_3: { x: 320, y: 240 },
            corridor_main_4: { x: 380, y: 240 },
            corridor_main_5: { x: 450, y: 240 },
            corridor_main_6: { x: 500, y: 240 },
            corridor_main_7: { x: 570, y: 240 },
            corridor_main_8: { x: 640, y: 240 },
            corridor_main_9: { x: 700, y: 240 },
            corridor_main_10: { x: 780, y: 240 },
            
            // 세로 연결 복도
            corridor_north_1: { x: 450, y: 160 },
            corridor_north_2: { x: 450, y: 120 },
            
            // 우회 경로
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
            '정문 → X-ray실': [
              'entrance_main',
              'corridor_north_2',
              'corridor_north_1',
              'corridor_main_5',
              'corridor_main_4',
              'door_xray',
            ],
            '정문 → CT실': [
              'entrance_main',
              'corridor_north_2',
              'corridor_north_1',
              'corridor_main_5',
              'corridor_main_4',
              'corridor_main_3',
              'door_ct',
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
            '정문 → 약국': [
              'entrance_main',
              'corridor_north_2',
              'corridor_north_1',
              'corridor_main_5',
              'corridor_main_6',
              'corridor_main_7',
              'corridor_main_8',
              'corridor_main_9',
              'corridor_main_10',
              'door_pharmacy',
            ],
          }
        }}
        destinations={[
          { 
            label: '채혈실',
            pathName: '정문 → 채혈실',
            icon: '💉',
            description: '본관 1층 동쪽'
          },
          { 
            label: '진단검사의학과',
            pathName: '정문 → 진단검사의학과',
            icon: '🔬',
            description: '본관 1층 중앙'
          },
          { 
            label: '응급센터',
            pathName: '정문 → 응급센터',
            icon: '🚨',
            description: '본관 1층 서쪽'
          },
          { 
            label: 'X-ray실',
            pathName: '정문 → X-ray실',
            icon: '📷',
            description: '본관 1층 중앙'
          },
          { 
            label: 'CT실',
            pathName: '정문 → CT실',
            icon: '🏥',
            description: '본관 1층 서쪽'
          },
          { 
            label: '편의점',
            pathName: '정문 → 편의점',
            icon: '🏪',
            description: '편의시설 구역'
          },
          { 
            label: '은행',
            pathName: '정문 → 은행',
            icon: '🏦',
            description: '편의시설 구역'
          },
          { 
            label: '약국',
            pathName: '정문 → 약국',
            icon: '💊',
            description: '본관 1층 동쪽 끝'
          },
        ]}
        title="병원 길찾기"
      />
    </div>
  );
}