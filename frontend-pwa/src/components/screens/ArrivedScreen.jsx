import React from 'react';
import useJourneyStore from '../../store/journeyStore';
import { useNavigate } from 'react-router-dom';

export default function ArrivedScreen() {
  const { user } = useJourneyStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 환영 메시지 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏥</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {user?.name}님, 병원에 도착하셨군요!
          </h1>
          <p className="text-xl text-gray-600">
            이제 접수를 진행해주세요
          </p>
        </div>

        {/* 현재 위치 표시 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📍</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">현재 위치</h3>
              <p className="text-gray-600">병원 정문 로비</p>
            </div>
          </div>
        </div>

        {/* 접수 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">
            접수 절차 안내
          </h3>
          <ol className="space-y-3 text-blue-800">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full 
                           flex items-center justify-center font-bold">1</span>
              <div>
                <p className="font-medium">접수처로 이동</p>
                <p className="text-sm mt-1">정문 들어오셔서 좌측 접수창구</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full 
                           flex items-center justify-center font-bold">2</span>
              <div>
                <p className="font-medium">신분증 제시</p>
                <p className="text-sm mt-1">본인 확인을 위해 신분증을 준비해주세요</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full 
                           flex items-center justify-center font-bold">3</span>
              <div>
                <p className="font-medium">접수 완료</p>
                <p className="text-sm mt-1">오늘의 검사 일정을 확인받으세요</p>
              </div>
            </li>
          </ol>
        </div>

        {/* 메인 액션 버튼 */}
        <button 
          onClick={() => navigate('/login')}
          className="w-full bg-blue-600 text-white rounded-2xl py-6 text-xl 
                   font-bold hover:bg-blue-700 transition-all duration-300
                   shadow-lg hover:shadow-xl transform hover:-translate-y-1
                   flex items-center justify-center gap-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          접수처로 가는 길 안내
        </button>

        {/* 추가 정보 */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <button className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 
                         hover:shadow-md transition-all duration-300 text-left group">
            <span className="text-2xl">🚗</span>
            <h3 className="text-base font-semibold text-gray-900 mt-2 
                         group-hover:text-blue-600 transition-colors">
              주차장 안내
            </h3>
          </button>
          
          <button className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 
                         hover:shadow-md transition-all duration-300 text-left group">
            <span className="text-2xl">🏢</span>
            <h3 className="text-base font-semibold text-gray-900 mt-2 
                         group-hover:text-blue-600 transition-colors">
              병원 시설 안내
            </h3>
          </button>
        </div>

        {/* 접수 마감 시간 안내 */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">접수 마감 시간: 오후 4시 30분</p>
          </div>
        </div>
      </div>
    </div>
  );
}