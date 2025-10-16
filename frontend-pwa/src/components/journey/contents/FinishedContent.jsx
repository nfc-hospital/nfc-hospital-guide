import React, { useState } from 'react';
import { CheckBadgeIcon, HomeIcon, CalendarIcon } from '@heroicons/react/24/outline';

/**
 * FinishedContent - 완료 상태의 순수 컨텐츠 컴포넌트
 *
 * Screen 요소 통합:
 * - 처방전 안내 (FinishedScreen의 기능 통합)
 * - 다음 예약 액션 버튼 (카카오톡, 알림)
 * - 알림 설정 모달
 *
 * Props는 JourneyContainer에서 전달받음 (API 조회는 Container 책임)
 */
const FinishedContent = ({
  nextAppointment,
  loadingNextAppointment,
  completedAppointments = [],
  hasPrescription = false
}) => {
  // 알림 모달 상태
  const [showModal, setShowModal] = useState(false);

  // 다음 일정 텍스트 생성
  const getNextScheduleText = () => {
    if (!nextAppointment) {
      return null;
    }

    const date = new Date(nextAppointment.scheduled_at);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return `오늘 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${nextAppointment.exam?.title || '다음 검사'}`;
    } else {
      return `${date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - ${nextAppointment.exam?.title || '다음 검사'}`;
    }
  };

  const nextScheduleText = getNextScheduleText();

  return (
    <div className="space-y-6">
      {/* 처방전 안내 - hasPrescription이 true일 때만 표시 */}
      {hasPrescription && (
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 shadow-lg border border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            처방전 안내
          </h3>
          <div className="bg-white rounded-xl p-4">
            <p className="text-lg text-gray-700 mb-3">
              조제약국에서 처방전을 제출하여 약을 받으세요.
            </p>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>처방전은 발행일로부터 3일 이내에 사용하세요</span>
            </div>
          </div>
        </section>
      )}

      {/* 다음 예약 관련 액션 - nextAppointment가 있을 때만 표시 */}
      {nextAppointment && (
        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 110 2h-1v9a3 3 0 01-3 3H9a3 3 0 01-3-3V9H5a1 1 0 110-2h3z" />
            </svg>
            다음 예약 준비
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {/* 카카오톡 메모 버튼 */}
            <button
              onClick={() => {
                if (window.Kakao) {
                  window.Kakao.Link.sendDefault({
                    objectType: 'text',
                    text: `[병원 예약 알림]\n다음 예약: ${nextScheduleText}\n\n이 메시지는 나에게 보내는 메모입니다.`,
                    link: {
                      mobileWebUrl: window.location.href,
                      webUrl: window.location.href
                    }
                  });
                } else {
                  alert('카카오톡이 설치되어 있지 않거나 연동되지 않았습니다.');
                }
              }}
              className="group bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-900 rounded-2xl p-4
                       font-bold hover:from-yellow-500 hover:to-amber-600 transition-all duration-300
                       shadow-lg hover:shadow-xl flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3C6.48 3 2 6.12 2 10c0 2.23 1.5 4.22 3.84 5.5-.15.5-.37 1.22-.57 1.84-.24.74.43 1.35 1.1.94.56-.34 1.41-.87 2.13-1.34C9.56 17.28 10.75 17.5 12 17.5c5.52 0 10-3.12 10-7.5S17.52 3 12 3z"/>
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-lg font-bold">카카오톡 메모</h4>
                <p className="text-sm opacity-80">나에게 예약 알림 보내기</p>
              </div>
            </button>

            {/* 알림 설정 버튼 */}
            <button
              onClick={() => setShowModal(true)}
              className="group bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-4
                       font-bold hover:from-blue-600 hover:to-indigo-700 transition-all duration-300
                       shadow-lg hover:shadow-xl flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                🔔
              </div>
              <div className="text-left">
                <h4 className="text-lg font-bold">알림 설정</h4>
                <p className="text-sm opacity-80">다음 예약까지 자동 알림</p>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* 다음 단계 안내 */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 shadow-md">
        <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
          📋 다음 단계 안내
        </h3>
        <ul className="space-y-4">
          {/* 다음 예약이 있을 경우 표시 */}
          {!loadingNextAppointment && nextAppointment && (
            <li className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="text-base text-blue-800 leading-relaxed">
                  <strong>다음 예약:</strong> {new Date(nextAppointment.scheduled_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {nextAppointment.exam && (
                  <div className="mt-1 text-sm text-blue-700">
                    {nextAppointment.exam.title} ({nextAppointment.exam.department})
                    {nextAppointment.exam.room && ` - ${nextAppointment.exam.room}`}
                  </div>
                )}
              </div>
            </li>
          )}

          <li className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-amber-100">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-base text-amber-800 leading-relaxed">검사 결과는 담당 의료진이 검토 후 안내드립니다</span>
          </li>
          <li className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-amber-100">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <HomeIcon className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-base text-amber-800 leading-relaxed">귀가 전 수납이 완료되었는지 확인해주세요</span>
          </li>
          <li className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-amber-100">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-600">
              💬
            </div>
            <span className="text-base text-amber-800 leading-relaxed">추가 검사나 진료가 필요한 경우 별도 연락드립니다</span>
          </li>
        </ul>
      </div>

      {/* 감사 인사 */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 text-center border border-gray-200 shadow-md">
        <div className="text-4xl mb-3">🙏</div>
        <h4 className="text-xl font-bold text-gray-800 mb-2">
          저희 병원을 이용해 주셔서 감사합니다
        </h4>
        <p className="text-base text-gray-600 leading-relaxed">
          더 나은 서비스로 보답하겠습니다
        </p>
      </div>

      {/* 알림 설정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-[fadeUp_0.4s_ease-out]">
            {/* 헤더 */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                🔔
              </div>
              <h3 className="text-2xl font-bold">다음 예약 알림</h3>
              <p className="text-blue-100 mt-1">편리한 병원 이용을 위한 스마트 알림</p>
            </div>

            {/* 내용 */}
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  알림 혜택
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">1</span>
                    </div>
                    <span className="text-gray-700">검사 전날 준비사항 알림</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <span className="text-gray-700">당일 아침 일정 알림</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <span className="text-gray-700">다음 방문까지 자동 로그인</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 mb-1">보안 안내</h5>
                    <p className="text-sm text-gray-700">
                      로그인 정보는 다음 예약일까지만<br />
                      휴대폰에 안전하게 저장됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 px-4 font-bold
                         hover:bg-gray-200 transition-all duration-300">
                취소
              </button>
              <button
                onClick={() => {
                  // TODO: 알림 설정 API 호출
                  setShowModal(false);
                  alert('알림이 설정되었습니다');
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3 px-4 font-bold
                         hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg">
                동의하고 설정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

FinishedContent.displayName = 'FinishedContent';

export default FinishedContent;
