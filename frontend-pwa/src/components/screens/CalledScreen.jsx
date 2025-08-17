import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import SimpleProgressBar from '../journey/SimpleProgressBar';

export default function CalledScreen() {
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
                    ${isBlinking ? 'bg-green-100' : 'bg-green-50'}`}>
      <div className={`shadow-lg transition-colors duration-500
                      ${isBlinking ? 'bg-green-600' : 'bg-green-500'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="animate-bounce mb-4">
            <span className="text-6xl">🔔</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {user?.name}님, 호출되었습니다!
          </h1>
          <p className="text-2xl text-green-100">
            검사실로 와주세요
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 전체 진행 상황 표시 */}
        <div className="mb-6">
          <SimpleProgressBar 
            patientState={user?.state || 'CALLED'} 
            appointments={todaysAppointments}
            showLabel={true}
          />
        </div>

        {examInfo && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 
                        transform scale-105 transition-transform">
            <div className="text-center space-y-6">
              <div>
                <p className="text-xl text-gray-600 mb-2">검사명</p>
                <p className="text-3xl font-bold text-gray-900">
                  {examInfo.title}
                </p>
              </div>

              <div className="w-full h-px bg-gray-200" />

              <div className="bg-blue-50 rounded-2xl p-6">
                <p className="text-lg text-blue-600 mb-3">검사실 위치</p>
                <div className="text-2xl font-bold text-blue-900">
                  <p>{examInfo.building}</p>
                  <p className="text-4xl my-2">{examInfo.floor}층</p>
                  <p className="text-3xl">{examInfo.room}</p>
                </div>
              </div>

              <button className="w-full bg-blue-600 text-white rounded-2xl py-6 text-xl 
                              font-bold hover:bg-blue-700 transition-all duration-300
                              shadow-lg hover:shadow-xl transform hover:-translate-y-1
                              flex items-center justify-center gap-3 group">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>검사실로 가는 길 안내</span>
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* NFC 태그 위치 정보가 있으면 현재 위치 표시 */}
        {taggedLocation && (
          <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-semibold text-green-900">현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}</p>
                {examInfo && taggedLocation.building === examInfo.building && taggedLocation.floor === parseInt(examInfo.floor) ? (
                  <p className="text-green-700 text-sm mt-1">✅ 같은 층에 있습니다. 가까운 곳에 검사실이 있어요!</p>
                ) : (
                  <p className="text-green-700 text-sm mt-1">검사실까지 안내해 드릴게요.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6
                      flex items-start gap-4">
          <span className="text-4xl">⏰</span>
          <div>
            <h3 className="text-xl font-semibold text-amber-900 mb-2">
              5분 이내 도착 필요
            </h3>
            <p className="text-amber-800">
              호출 후 5분 이내에 검사실에 도착하지 않으시면 
              다음 환자분께 순서가 넘어갈 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button className="text-gray-600 underline hover:text-gray-800">
            호출 확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}