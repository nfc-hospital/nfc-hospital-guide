import React from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';

export default function UnregisteredScreen() {
  const navigate = useNavigate();
  const { user } = useJourneyStore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 환영 메시지 */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🏥</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            병원에 오신 것을 환영합니다
          </h1>
          <p className="text-xl text-gray-600">
            {user?.name ? `${user.name}님, ` : ''}간편하게 접수하고 진료받으세요
          </p>
        </div>

        {/* 메인 CTA 버튼 */}
        <button 
          onClick={() => navigate('/login')}
          className="w-full bg-blue-600 text-white rounded-3xl py-6 text-2xl 
                   font-bold hover:bg-blue-700 transition-all duration-300
                   shadow-lg hover:shadow-xl transform hover:-translate-y-1
                   mb-6 animate-pulse">
          📱 간편 접수하기
        </button>

        {/* 접수 방법 안내 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            ℹ️ 접수 방법 안내
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full 
                           flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">간편 로그인</p>
                <p className="text-gray-600 text-sm mt-1">
                  전화번호 뒷자리 4자리와 생년월일로 로그인
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full 
                           flex items-center justify-center">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">오늘 일정 확인</p>
                <p className="text-gray-600 text-sm mt-1">
                  예약된 검사 일정과 순서를 확인
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full 
                           flex items-center justify-center">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">실시간 안내</p>
                <p className="text-gray-600 text-sm mt-1">
                  대기 상황과 호출 알림을 실시간으로 받아보세요
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button 
            onClick={() => navigate('/voice-guide')}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
                     hover:shadow-md transition-all duration-300 text-left group">
            <span className="text-3xl">🎯</span>
            <h3 className="text-lg font-semibold text-gray-900 mt-2 
                         group-hover:text-blue-600 transition-colors">
              진료과 찾기
            </h3>
            <p className="text-gray-600 text-sm mt-1">어디로 가야할지 모르시나요?</p>
          </button>
          
          <button 
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
                     hover:shadow-md transition-all duration-300 text-left group">
            <span className="text-3xl">🗺️</span>
            <h3 className="text-lg font-semibold text-gray-900 mt-2 
                         group-hover:text-blue-600 transition-colors">
              병원 지도
            </h3>
            <p className="text-gray-600 text-sm mt-1">병원 내부 시설 위치 확인</p>
          </button>
        </div>

        {/* 음성 안내 */}
        <button 
          onClick={() => navigate('/voice-guide')}
          className="w-full bg-green-50 border border-green-200 rounded-2xl p-6
                   hover:bg-green-100 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl">🔊</span>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-green-900 
                             group-hover:text-green-700">
                  음성으로 물어보세요
                </h3>
                <p className="text-green-700 text-sm mt-1">
                  "화장실 어디에요?", "주차요금은?" 등
                </p>
              </div>
            </div>
            <svg className="w-6 h-6 text-green-600 group-hover:translate-x-1 transition-transform" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* 문의 정보 */}
        <div className="mt-6 text-center text-gray-600">
          <p>도움이 필요하신가요?</p>
          <p className="font-medium">원무과 ☎️ 02-1234-5678</p>
        </div>
      </div>
    </div>
  );
}