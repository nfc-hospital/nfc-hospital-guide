import React, { useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import Modal from '../common/Modal';

export default function PaymentScreen({ taggedLocation }) {
  const { user, todaysAppointments } = useJourneyStore();
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // 완료된 검사 목록
  const completedExams = todaysAppointments?.filter(
    apt => apt.status === 'completed'
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            수납이 필요합니다
          </h1>
          <p className="text-lg text-gray-600 mt-1">
            {user?.name}님, 원무과에서 수납해주세요
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* NFC 태그 위치 정보 표시 */}
        {taggedLocation && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <p className="font-semibold text-purple-900">
                  현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}
                </p>
                {taggedLocation.room?.includes('원무') ? (
                  <p className="text-purple-700 mt-1">
                    💳 이곳에서 수납하실 수 있습니다. 대기번호표를 뽑고 순서를 기다려주세요.
                  </p>
                ) : (
                  <p className="text-purple-700 mt-1">
                    💡 수납은 본관 1층 원무과에서 하실 수 있습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 수납 안내 카드 */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">💳</span>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                수납 안내
              </h3>
              <p className="text-blue-800 mb-4">
                오늘 진행하신 검사에 대한 수납이 필요합니다.
                원무과에서 수납 후 귀가하실 수 있습니다.
              </p>
              
              {/* 완료된 검사 목록 */}
              {completedExams.length > 0 && (
                <div className="mt-4 bg-white rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    완료된 검사 ({completedExams.length}건)
                  </p>
                  <ul className="space-y-1">
                    {completedExams.map(exam => (
                      <li key={exam.appointment_id} 
                          className="text-gray-600 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" 
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                                clipRule="evenodd" />
                        </svg>
                        {exam.exam?.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 원무과 위치 안내 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            원무과 위치
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏢</span>
              <div>
                <p className="font-medium text-gray-900">본관 1층</p>
                <p className="text-gray-600">정문 들어오셔서 우측</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">현재 원무과 대기 시간</span>
              </div>
              <p className="text-2xl font-bold text-amber-900 mt-2">
                약 15분
              </p>
            </div>

            <button 
              onClick={() => {
                setShowLocationModal(true);
                // TODO: [NAVIGATION-API] 원무과 길안내 API 연동 필요
              }}
              className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg 
                           font-semibold hover:bg-blue-700 transition-colors duration-200
                           flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              원무과 가는 길 안내
            </button>
          </div>
        </div>

        {/* 수납 방법 선택 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            수납 방법
          </h3>
          
          <div className="space-y-3">
            <button className="w-full p-4 border-2 border-gray-200 rounded-xl
                           hover:border-blue-400 hover:bg-blue-50 transition-all duration-200
                           text-left group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-700">
                      현금/카드 수납
                    </p>
                    <p className="text-sm text-gray-600">원무과 창구에서 직접 수납</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button className="w-full p-4 border-2 border-gray-200 rounded-xl
                           hover:border-blue-400 hover:bg-blue-50 transition-all duration-200
                           text-left group opacity-50 cursor-not-allowed" disabled>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="font-medium text-gray-500">
                      모바일 간편 결제
                    </p>
                    <p className="text-sm text-gray-400">준비 중입니다</p>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 참고 사항 */}
        <div className="bg-gray-100 rounded-2xl p-4">
          <p className="text-gray-700 text-center">
            수납 관련 문의: 원무과 ☎️ 02-1234-5678
          </p>
        </div>
      </div>

      {/* 원무과 위치 안내 모달 */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="원무과 위치 안내"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">💳</span>
              <div>
                <h3 className="text-xl font-bold text-blue-900">
                  원무과 수납창구
                </h3>
                <p className="text-lg text-blue-700">
                  본관 1층 중앙홀 우측
                </p>
              </div>
            </div>
            
            {/* TODO: [NAVIGATION-COMPONENT] 실시간 길안내 컴포넌트로 교체 필요 */}
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <p className="text-gray-700">중앙 엘리베이터에서 1층으로 내려오세요</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <p className="text-gray-700">
                  중앙홀에서 우측으로 돌아보세요
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <p className="text-gray-700">
                  '수납/원무과' 표지판을 따라가세요
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-medium text-amber-900">수납 팁</p>
                <p className="text-amber-800 text-sm mt-1">
                  대기번호표를 뽑고, 전광판에서 번호를 확인하세요. 
                  신용카드, 체크카드, 현금 모두 사용 가능합니다.
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
    </div>
  );
}