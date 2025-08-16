import React from 'react';
import useJourneyStore from '../../store/journeyStore';

export default function PaymentScreen() {
  const { user, todaysAppointments } = useJourneyStore();
  
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

            <button className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg 
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
    </div>
  );
}