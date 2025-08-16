import React, { useEffect, useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import QueueStatus from '../journey/QueueStatus';
import ProgressBar from '../journey/ProgressBar';
import { useRealtimeQueues } from '../../hooks/useRealtimeQueues';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function WaitingScreen() {
  const { user, currentQueues, todaysAppointments } = useJourneyStore();
  const [showPreparation, setShowPreparation] = useState(false);
  const { refresh } = useRealtimeQueues(true);

  // 현재 대기 중인 큐 찾기
  const activeQueue = currentQueues.find(
    q => q.state === 'waiting' || q.state === 'ongoing'
  );

  // 진행 중인 검사 찾기
  const ongoingAppointment = todaysAppointments?.find(
    apt => apt.status === 'ongoing'
  );

  const currentExam = ongoingAppointment || activeQueue;
  const isOngoing = user?.state === 'ONGOING' || activeQueue?.state === 'ongoing';

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

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 대기/진행 상태 카드 */}
        {activeQueue && (
          <QueueStatus queue={activeQueue} />
        )}

        {/* 진행 상황 */}
        <ProgressBar appointments={todaysAppointments} />

        {/* 현재 검사 정보 */}
        {currentExam && (
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
                  className="w-full mt-4 bg-blue-50 text-blue-700 rounded-xl py-3 px-4
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

        {/* 대기 중 이용 가능한 옵션들 */}
        {!isOngoing && (
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
                           hover:shadow-md transition-all duration-300 text-left group">
              <span className="text-3xl">🚻</span>
              <h3 className="text-lg font-semibold text-gray-900 mt-2 
                           group-hover:text-blue-600 transition-colors">
                화장실 위치
              </h3>
              <p className="text-gray-600 mt-1">가장 가까운 화장실 안내</p>
            </button>
            
            <button className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
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
    </div>
  );
}