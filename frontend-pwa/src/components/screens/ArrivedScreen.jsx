import React, { useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import { useNavigate } from 'react-router-dom';
import SimpleProgressBar from '../journey/SimpleProgressBar';
import Modal from '../common/Modal';

export default function ArrivedScreen({ taggedLocation }) {
  const { user, todaysAppointments } = useJourneyStore();
  const navigate = useNavigate();
  const [showLocationModal, setShowLocationModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 전체 진행 상황 표시 */}
        <div className="mb-6">
          <SimpleProgressBar 
            patientState={user?.state || 'ARRIVED'} 
            appointments={todaysAppointments}
            showLabel={true}
          />
        </div>

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

        {/* NFC 태그 위치 정보 표시 */}
        {taggedLocation ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-4">
              <span className="text-4xl">📍</span>
              <div>
                <h3 className="text-lg font-semibold text-green-900">현재 위치</h3>
                <p className="text-green-700">{taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}</p>
                {taggedLocation.type === 'lobby' && (
                  <p className="text-green-600 text-sm mt-1">접수처는 정문에서 좌측에 있습니다</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">📍</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">현재 위치</h3>
                <p className="text-gray-600">병원 정문 로비</p>
              </div>
            </div>
          </div>
        )}

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
          onClick={() => {
            setShowLocationModal(true);
            // TODO: [NAVIGATION-API] 접수처 길안내 API 연동 필요
          }}
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

      {/* 접수처 위치 정보 모달 */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="접수처 위치 안내"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🏢</span>
              <div>
                <h3 className="text-xl font-bold text-blue-900">
                  원무과 접수처
                </h3>
                <p className="text-lg text-blue-700">
                  본관 1층 중앙홀 좌측
                </p>
              </div>
            </div>
            
            {/* TODO: [NAVIGATION-COMPONENT] 실시간 길안내 컴포넌트로 교체 필요 */}
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <p className="text-gray-700">정문으로 들어오세요</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <p className="text-gray-700">
                  중앙홀에서 좌측으로 돌아보세요
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <p className="text-gray-700">
                  파란색 '접수/수납' 표지판을 따라가세요
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-green-900">준비물</p>
                <p className="text-green-800 text-sm mt-1">
                  신분증, 진료의뢰서(있는 경우)를 준비해주세요.
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