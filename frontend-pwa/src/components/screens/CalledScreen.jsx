import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
// import SimpleProgressBar from '../journey/SimpleProgressBar';
import Modal from '../common/Modal';
import { generateNavigationKeywords } from '../../utils/nfcLocation';
import UnifiedHeader from '../common/UnifiedHeader';

export default function CalledScreen({ taggedLocation }) {
  const { user, currentQueues, todaysAppointments } = useJourneyStore();
  const [isBlinking, setIsBlinking] = useState(true);
  const [showNavigationModal, setShowNavigationModal] = useState(false);

  // 호출된 큐 찾기
  const calledQueue = currentQueues.find(q => q.state === 'called');
  const calledAppointment = todaysAppointments?.find(
    apt => apt.status === 'called' || 
    (calledQueue && apt.appointment_id === calledQueue.appointment_id)
  );

  const examInfo = calledQueue?.exam || calledAppointment?.exam;
  
  // NFC 태깅 시 길안내용 키워드 생성
  const navigationKeywords = taggedLocation && examInfo ? 
    generateNavigationKeywords(taggedLocation, examInfo) : null;

  useEffect(() => {
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
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-20
                    ${isBlinking ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-green-50 to-emerald-50'}`}>
      <div className={`shadow-2xl transition-all duration-500
                      ${isBlinking ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`}>
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="animate-bounce mb-6">
            <div className="w-32 h-32 mx-auto bg-white/20 backdrop-blur-sm rounded-full 
                         flex items-center justify-center shadow-2xl">
              <span className="text-8xl">🔔</span>
            </div>
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-4">
            {user?.name}님, 호출되었습니다!
          </h1>
          <p className="text-3xl text-green-100 font-semibold">
            검사실로 와주세요
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 통합 헤더 - 호출됨 상태 표시 */}
        <UnifiedHeader currentState="CALLED" />

        {examInfo && (
          <div className="bg-white rounded-3xl shadow-2xl p-10 mb-8 
                        transform scale-105 transition-all duration-300 border-4 border-green-200">
            <div className="text-center space-y-8">
              <div>
                <p className="text-2xl text-gray-600 mb-4">검사명</p>
                <p className="text-4xl font-extrabold text-gray-900">
                  {examInfo.title}
                </p>
              </div>

              <div className="w-full h-1 bg-gradient-to-r from-green-200 to-emerald-200 rounded-full" />

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-lg">
                <p className="text-2xl text-blue-600 mb-6 font-bold">검사실 위치</p>
                <div className="text-3xl font-extrabold text-blue-900">
                  <p className="text-2xl">{examInfo.building}</p>
                  <p className="text-6xl my-4 text-blue-600">{examInfo.floor}층</p>
                  <p className="text-4xl">{examInfo.room}</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowNavigationModal(true);
                  // TODO: [NAVIGATION-API] 검사실 길안내 API 연동 필요
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl py-8 text-2xl 
                          font-extrabold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300
                          shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 hover:scale-[1.02]
                          flex items-center justify-center gap-4 group border-4 border-blue-200">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                          d="M15 11a3 3 0 11-6 0 3 3 0 616 0z" />
                  </svg>
                </div>
                <span>
                  {taggedLocation ? '검사실까지 길안내' : '검사실 위치 보기'}
                </span>
                <svg className="w-8 h-8 group-hover:translate-x-2 transition-transform" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                        d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* NFC 태그 위치 정보가 있으면 현재 위치 표시 */}
        {taggedLocation && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-3xl p-8 mb-8 animate-fade-in shadow-xl">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-green-200 to-green-300 rounded-2xl 
                          flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-3xl">📍</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900 mb-2">현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}</p>
                {examInfo && taggedLocation.building === examInfo.building && taggedLocation.floor === parseInt(examInfo.floor) ? (
                  <p className="text-xl text-green-700 leading-relaxed">✅ 같은 층에 있습니다. 검사실까지 길안내를 받으세요!</p>
                ) : (
                  <p className="text-xl text-green-700 leading-relaxed">검사실까지 최적 경로로 안내해 드릴게요.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-amber-50 to-red-50 border-3 border-amber-300 rounded-3xl p-8
                      flex items-start gap-6 shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-200 to-amber-300 rounded-3xl 
                      flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-4xl">⏰</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-900 mb-3">
              5분 이내 도착 필요
            </h3>
            <p className="text-xl text-amber-800 leading-relaxed">
              호출 후 5분 이내에 검사실에 도착하지 않으시면 
              다음 환자분께 순서가 넘어갈 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-12 py-4 rounded-2xl 
                           text-lg font-bold hover:from-gray-200 hover:to-gray-300 transition-all duration-300
                           shadow-lg hover:shadow-xl">
            호출 확인했습니다
          </button>
        </div>
      </div>

      {/* 검사실 길안내 모달 */}
      <Modal
        isOpen={showNavigationModal}
        onClose={() => setShowNavigationModal(false)}
        title="검사실 길안내"
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              검사실까지 안내
            </h3>
            {taggedLocation ? (
              <p className="text-lg text-gray-600">
                현재 위치에서 검사실까지의 최적 경로를 안내해드립니다
              </p>
            ) : (
              <p className="text-lg text-gray-600">
                검사실의 위치와 찾아가는 방법을 안내해드립니다
              </p>
            )}
          </div>

          {/* [NAVIGATION-COMPONENT] 길안내 지도 컴포넌트가 들어갈 자리 */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-blue-300 p-8 text-center">
            <h3 className="text-xl font-semibold text-blue-700 mb-2">
              [NAVIGATION-COMPONENT]
            </h3>
            <p className="text-blue-600 mb-4">
              실시간 길안내 지도 컴포넌트가 여기에 표시됩니다
            </p>
            
            {examInfo && (
              <div className="bg-blue-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-600 mb-1">목적지</p>
                <p className="text-lg font-bold text-blue-900">
                  {examInfo.building} {examInfo.floor}층 {examInfo.room}
                </p>
                <p className="text-blue-700">{examInfo.title}</p>
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
            {navigationKeywords && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
                <p className="font-mono text-gray-600">
                  {navigationKeywords.apiKeyword}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  API 검색: {navigationKeywords.searchParams.from} → {navigationKeywords.searchParams.to}
                </p>
              </div>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">긴급 알림</span>
            </div>
            <p className="text-red-700 mt-2">
              호출 후 5분 이내에 검사실에 도착해주세요! 늦으시면 다음 환자분께 순서가 넘어갈 수 있습니다.
            </p>
          </div>
          
          <button 
            onClick={() => setShowNavigationModal(false)}
            className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-semibold
                     hover:bg-blue-700 transition-colors duration-200"
          >
            확인했습니다
          </button>
        </div>
      </Modal>
    </div>
  );
}