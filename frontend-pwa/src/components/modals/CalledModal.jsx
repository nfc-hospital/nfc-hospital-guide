import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';

export default function CalledModal({ isOpen, onClose }) {
  const { user, currentQueues, todaysAppointments } = useJourneyStore();
  const [isBlinking, setIsBlinking] = useState(true);

  // 호출된 큐 찾기
  const calledQueue = currentQueues.find(q => q.state === 'called');
  const calledAppointment = todaysAppointments?.find(
    apt => apt.status === 'called' || 
    (calledQueue && apt.appointment_id === calledQueue.appointment_id)
  );

  const examInfo = calledQueue?.exam || calledAppointment?.exam;

  useEffect(() => {
    if (!isOpen) return;

    // 진동 (모바일)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // 소리 알림 (추후 구현)
    // const audio = new Audio('/notification.mp3');
    // audio.play();

    // 깜빡임 애니메이션
    const interval = setInterval(() => {
      setIsBlinking(prev => !prev);
    }, 500);

    return () => {
      clearInterval(interval);
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 전체 화면 검정 반투명 배경 + 백드롭 블러 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨테이너 - 하단에서 슬라이드 업 */}
      <div className={`relative w-full max-w-md mx-4 transform transition-all duration-500 ease-out ${
        isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-full opacity-0 scale-95'
      }`}>
        {/* 메인 카드 - 더 크고 눈에 띄게 */}
        <div className={`rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 transform ${
          isBlinking 
            ? 'bg-gradient-to-br from-red-500 to-rose-600 scale-105' 
            : 'bg-gradient-to-br from-red-600 to-rose-700 scale-100'
        }`}>
          {/* 상단 헤더 - 더 크고 강렬하게 */}
          <div className="p-8 text-center">
            {/* 호출 벨 아이콘 - 더 크고 화려하게 */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-white/20 rounded-full animate-ping" />
              </div>
              <div className="relative animate-bounce">
                <div className="w-28 h-28 mx-auto bg-white/40 backdrop-blur-sm rounded-full 
                             flex items-center justify-center shadow-2xl
                             border-4 border-white/30">
                  <span className="text-7xl filter drop-shadow-lg">🔔</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl font-black text-white mb-3 tracking-wide">
              호출되었습니다!
            </h1>
            <p className="text-2xl text-red-100 font-semibold">
              {user?.name}님, 검사실로 와주세요
            </p>
          </div>

          {/* 검사 정보 - 더 크고 명확하게 */}
          {examInfo && (
            <div className="bg-white mx-6 rounded-3xl p-8 mb-6 shadow-inner">
              <div className="text-center space-y-6">
                {/* 검사명 */}
                <div>
                  <p className="text-lg text-gray-600 mb-2 font-medium">검사명</p>
                  <p className="text-3xl font-black text-gray-900">
                    {examInfo.title}
                  </p>
                </div>

                {/* 구분선 */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

                {/* 위치 정보 - 배경을 더 돋보이게 */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-6 shadow-md">
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl" />
                  <div className="relative">
                    <p className="text-lg text-blue-700 mb-3 font-bold">
                      📍 검사실 위치
                    </p>
                    <div className="text-blue-900 space-y-2">
                      <p className="text-xl font-semibold">{examInfo.building}</p>
                      <p className="text-5xl font-black text-blue-600">{examInfo.floor}층</p>
                      <p className="text-3xl font-bold bg-white/50 backdrop-blur-sm rounded-xl py-2 px-4 inline-block">
                        {examInfo.room}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 하단 버튼 영역 - 더 크고 누르기 쉬게 */}
          <div className="p-6 space-y-4">
            {/* 확인 버튼 - 더 크고 눈에 띄게 */}
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-3xl blur-sm opacity-50" />
              <button 
                onClick={onClose}
                className="relative w-full bg-white text-red-600 rounded-3xl py-6 text-2xl 
                         font-black hover:bg-gray-50 transition-all duration-300
                         shadow-2xl flex items-center justify-center gap-3
                         min-h-[80px] transform hover:scale-105"
              >
                <span className="text-3xl">✅</span>
                <span>확인했습니다</span>
              </button>
            </div>

            {/* 길찾기 버튼 - 더 명확하게 */}
            <button 
              onClick={() => {
                // TODO: 길찾기 기능 구현
                onClose();
              }}
              className="w-full bg-white/25 text-white rounded-3xl py-5 text-xl 
                       font-bold hover:bg-white/35 transition-all duration-300
                       backdrop-blur-sm border-2 border-white/40
                       flex items-center justify-center gap-3
                       shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>길찾기</span>
            </button>
          </div>

          {/* 긴급 안내 - 더 크고 강조 */}
          <div className="bg-gradient-to-r from-amber-600/30 to-orange-600/30 backdrop-blur-sm mx-6 mb-6 rounded-2xl p-5 border-2 border-amber-400/50 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-300/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-3xl animate-pulse">⏰</span>
              </div>
              <div className="flex-1">
                <p className="text-white text-xl font-bold mb-1">
                  5분 이내 도착 필요
                </p>
                <p className="text-amber-100 text-base leading-relaxed">
                  늦으시면 다음 환자분께 순서가 넘어갈 수 있습니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}