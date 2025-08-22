import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';

export default function CalledModal({ isOpen, onClose }) {
  const { user, currentQueues, todaysAppointments } = useJourneyStore();
  const [isClosing, setIsClosing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // 호출된 큐 찾기
  const calledQueue = currentQueues.find(q => q.state === 'called');
  const calledAppointment = todaysAppointments?.find(
    apt => apt.status === 'called' || 
    (calledQueue && apt.appointment_id === calledQueue.appointment_id)
  );

  const examInfo = calledQueue?.exam || calledAppointment?.exam;

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
      setIsMinimized(false);
      return;
    }

    // 진동 (모바일)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // 소리 알림 (추후 구현)
    // const audio = new Audio('/notification.mp3');
    // audio.play();

    return () => {
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [isOpen]);

  const handleConfirm = () => {
    setIsClosing(true);
    // 축소 애니메이션 후 최소화된 상태로 전환
    setTimeout(() => {
      setIsMinimized(true);
      setIsClosing(false);
    }, 300);
  };

  const handleReopen = () => {
    setIsMinimized(false);
    // 깜빡임 효과 없이 종 애니메이션만 재시작
    if ('vibrate' in navigator) {
      navigator.vibrate([100]);
    }
  };

  if (!isOpen) return null;

  // 최소화된 상태 - 하단에 챗봇 옆에 가로로 길게 표시
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 right-28 z-50"> {/* 우측에 챗봇과 여백 확보 */}
        <button 
          onClick={handleReopen}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-xl p-3 shadow-lg border border-amber-400 hover:shadow-xl transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg animate-pulse">🔔</span>
              <span className="text-sm font-bold">호출됨 - {examInfo?.title || '검사실'}로 이동해주세요</span>
            </div>
            <span 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white/80 hover:text-white text-xl ml-2 px-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ×
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 전체 화면 검정 반투명 배경 + 백드롭 블러 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 모달 컨테이너 - 하단에서 슬라이드 업 */}
      <div className={`relative w-full mx-4 transform transition-all duration-500 ease-out ${
        isClosing 
          ? 'max-w-xs translate-y-16 opacity-80 scale-75' 
          : isOpen 
            ? 'max-w-sm translate-y-0 opacity-100 scale-100' 
            : 'max-w-sm translate-y-full opacity-0 scale-95'
      }`}>
        {/* 메인 카드 - 흰색 배경에 연노랑 포인트 */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-200">
          {/* 상단 헤더 - 진한 노란색 배경 */}
          <div className="p-6 text-center bg-gradient-to-b from-amber-500 to-yellow-600">
            {/* 호출 벨 아이콘 - 적당한 크기로 */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full opacity-30" />
              </div>
              <div className="relative animate-bounce">
                <div className="w-16 h-16 mx-auto bg-white rounded-full 
                             flex items-center justify-center shadow-lg
                             border-2 border-amber-200">
                  <span className="text-4xl filter drop-shadow-lg">🔔</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-2xl font-black text-white mb-2 tracking-wide drop-shadow-md">
              호출되었습니다!
            </h1>
            <p className="text-lg text-white/90 font-semibold">
              {user?.name}님, 검사실로 와주세요
            </p>
          </div>

          {/* 검사 정보 - 적당한 크기로 */}
          {examInfo && (
            <div className="bg-gray-50 mx-4 rounded-2xl p-4 mb-4">
              <div className="text-center space-y-3">
                {/* 검사명 */}
                <div>
                  <p className="text-sm text-gray-600 mb-1 font-medium">검사명</p>
                  <p className="text-xl font-black text-gray-900">
                    {examInfo.title}
                  </p>
                </div>

                {/* 구분선 */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

                {/* 위치 정보 - 한 줄로 간결하게 */}
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-center">
                    <span className="text-sm text-amber-600 mr-2">📍 위치:</span>
                    <span className="text-lg font-bold text-gray-800">
                      {examInfo.building} {examInfo.floor}층 {examInfo.room}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 하단 버튼 영역 - 적당한 크기로 */}
          <div className="p-4 space-y-3 bg-gray-50">
            {/* 확인 버튼 - 클릭 시 축소 애니메이션 */}
            <button 
              onClick={handleConfirm}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-2xl py-4 text-lg 
                       font-bold hover:from-amber-600 hover:to-yellow-700 transition-all duration-300
                       shadow-lg flex items-center justify-center gap-2
                       min-h-[60px] transform hover:scale-105 active:scale-95"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                        d="M5 13l4 4L19 7" />
                </svg>
                <span>확인했습니다</span>
            </button>

            {/* 길찾기 버튼 - 더 작게 */}
            <button 
              onClick={() => {
                // TODO: 길찾기 기능 구현
                handleConfirm();
              }}
              className="w-full bg-white text-amber-600 rounded-2xl py-3 text-lg 
                       font-bold hover:bg-amber-50 transition-all duration-300
                       border-2 border-amber-200
                       flex items-center justify-center gap-2
                       shadow hover:shadow-md transform hover:scale-105 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>길찾기</span>
            </button>
          </div>

          {/* 긴급 안내 - 적당한 크기로 */}
          <div className="bg-amber-50 mx-4 mb-4 rounded-xl p-3 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⏰</span>
              </div>
              <div className="flex-1">
                <p className="text-amber-700 text-base font-bold mb-1">
                  5분 이내 도착 필요
                </p>
                <p className="text-amber-600 text-sm leading-relaxed">
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