import React, { useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
// import SimpleProgressBar from '../journey/SimpleProgressBar';
import Modal from '../common/Modal';
import SlideNavigation from '../common/SlideNavigation';
import { calculateNFCDistance, getDestinationByState, getInitialSlideIndex, generateNavigationKeywords } from '../../utils/nfcLocation';
import UnifiedHeader from '../common/UnifiedHeader';

export default function PaymentScreen({ taggedLocation }) {
  const { user, todaysAppointments } = useJourneyStore();
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // 완료된 검사 목록
  const completedExams = todaysAppointments?.filter(
    apt => apt.status === 'completed'
  ) || [];

  // NFC 위치 판별 및 슬라이드 설정
  const destination = getDestinationByState('PAYMENT');
  const locationInfo = taggedLocation ? calculateNFCDistance(taggedLocation, destination) : { isNearby: false };
  const initialSlide = getInitialSlideIndex(locationInfo.isNearby);
  const navigationKeywords = generateNavigationKeywords(taggedLocation, destination);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 통합 헤더 - 수납 상태 표시 */}
        <UnifiedHeader currentState="PAYMENT" />

        <div className="h-[calc(100vh-200px)] flex flex-col">
          <div className="flex-1">
          <SlideNavigation 
            defaultSlide={initialSlide}
            showDots={true}
          >
            {/* 슬라이드 1: 수납 메인 화면 */}
            <div className="h-full flex flex-col justify-center px-6">
              <div className="text-center">
                {/* 메인 아이콘 */}
                <div className="mb-8">
                  <div className="w-40 h-40 mx-auto bg-gradient-to-br from-amber-100 to-amber-200 
                               rounded-full flex items-center justify-center shadow-2xl">
                    <span className="text-8xl">💳</span>
                  </div>
                </div>
                
                {/* 메인 메시지 */}
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                  수납이 필요합니다
                </h1>
                <p className="text-2xl text-gray-700 mb-8">
                  {user?.name}님, 검사가 모두 완료되었습니다
                </p>
                
                {/* 검사 완료 현황 */}
                <div className="bg-green-50 rounded-2xl p-6 mb-8 inline-block">
                  <p className="text-xl text-green-800 font-medium">
                    ✅ 완료된 검사: {completedExams.length}건
                  </p>
                </div>
                
                {/* 메인 CTA 버튼 */}
                <button 
                  onClick={() => setShowLocationModal(true)}
                  className="w-full max-w-md mx-auto bg-amber-600 text-white rounded-2xl 
                           py-8 text-2xl font-bold shadow-xl hover:bg-amber-700 
                           hover:shadow-2xl transition-all duration-300
                           flex items-center justify-center gap-3"
                >
                  원무과에서 수납하기
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                          d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>

          {/* 슬라이드 2: 수납 안내 */}
          <div className="h-full flex flex-col justify-center px-6">
            <div className="max-w-2xl mx-auto w-full">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                수납 절차 안내
              </h2>
              
              {/* 수납 위치 */}
              <div className="bg-amber-50 rounded-3xl p-8 mb-6 text-center">
                <div className="text-5xl mb-4">🏢</div>
                <h3 className="text-2xl font-bold text-amber-900 mb-2">원무과 위치</h3>
                <p className="text-xl text-amber-700">본관 1층 중앙홀 우측</p>
              </div>
              
              {/* 간단한 절차 */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
                  <div className="w-14 h-14 bg-amber-600 text-white rounded-xl flex items-center justify-center text-xl font-bold">
                    1
                  </div>
                  <p className="text-xl text-gray-800">대기번호표를 받으세요</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
                  <div className="w-14 h-14 bg-amber-600 text-white rounded-xl flex items-center justify-center text-xl font-bold">
                    2
                  </div>
                  <p className="text-xl text-gray-800">번호가 호출되면 창구로 가세요</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white rounded-2xl p-6 shadow-md">
                  <div className="w-14 h-14 bg-amber-600 text-white rounded-xl flex items-center justify-center text-xl font-bold">
                    3
                  </div>
                  <p className="text-xl text-gray-800">수납 후 영수증을 받으세요</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 슬라이드 3: 원무과 위치 지도 */}
          <div className="h-full overflow-y-auto px-6 py-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              원무과 찾아가기
            </h2>

            {/* [NAVIGATION-COMPONENT] 지도 컴포넌트가 들어갈 자리 */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                [NAVIGATION-COMPONENT]
              </h3>
              <p className="text-gray-600 mb-4">
                원무과 길찾기 지도 컴포넌트가 여기에 표시됩니다
              </p>
              
              {destination && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-600 mb-1">목적지</p>
                  <p className="text-lg font-bold text-blue-900">
                    {destination.building} {destination.floor}층 {destination.room}
                  </p>
                  <p className="text-blue-700">{destination.description}</p>
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
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm">
                <p className="font-mono text-gray-600">
                  {navigationKeywords.apiKeyword}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  API 검색: {navigationKeywords.searchParams.from} → {navigationKeywords.searchParams.to}
                </p>
              </div>
            </div>

            {/* 원무과 요약 정보 */}
            <div className="bg-amber-50 rounded-2xl p-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-base text-amber-700">예상 대기시간</p>
                    <p className="text-xl font-bold text-amber-900">약 15분</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base text-amber-700">문의</p>
                  <p className="text-lg font-bold text-amber-900">02-1234-5678</p>
                </div>
              </div>
            </div>
          </div>
        </SlideNavigation>
          </div>
        </div>
      </div>

      {/* 원무과 위치 안내 모달 */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="원무과 위치"
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              본관 1층 중앙홀 우측
            </h3>
            <p className="text-lg text-gray-600">
              정문으로 들어오셔서 오른쪽으로 가시면 됩니다
            </p>
          </div>
          
          <div className="bg-amber-50 rounded-2xl p-6">
            <h4 className="text-xl font-semibold text-amber-900 mb-4">간단한 길 안내</h4>
            <div className="space-y-3">
              <p className="text-lg text-amber-800">① 엘리베이터로 1층 이동</p>
              <p className="text-lg text-amber-800">② 중앙홀에서 우측 방향</p>
              <p className="text-lg text-amber-800">③ 원무과 표지판 확인</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowLocationModal(false)}
            className="w-full bg-amber-600 text-white rounded-2xl py-6 text-xl font-semibold
                     hover:bg-amber-700 transition-colors duration-200"
          >
            확인
          </button>
        </div>
      </Modal>
    </div>
  );
}