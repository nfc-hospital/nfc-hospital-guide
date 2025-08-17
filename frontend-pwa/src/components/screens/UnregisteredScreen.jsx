import React from 'react';
import { useNavigate } from 'react-router-dom';
import useJourneyStore from '../../store/journeyStore';
import SlideNavigation from '../common/SlideNavigation';
import { calculateNFCDistance, getDestinationByState, getInitialSlideIndex, generateNavigationKeywords } from '../../utils/nfcLocation';

export default function UnregisteredScreen({ taggedLocation }) {
  const navigate = useNavigate();
  const { user } = useJourneyStore();

  // NFC 위치 판별 및 슬라이드 설정
  const destination = getDestinationByState('UNREGISTERED');
  const locationInfo = taggedLocation ? calculateNFCDistance(taggedLocation, destination) : { isNearby: false };
  const initialSlide = getInitialSlideIndex(locationInfo.isNearby);
  const navigationKeywords = generateNavigationKeywords(taggedLocation, destination);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-[calc(100vh-100px)]">
          <SlideNavigation 
            defaultSlide={initialSlide}
            showDots={true}
          >
          {/* 슬라이드 1: 환영 메시지 및 접수 안내 */}
          <div className="h-full overflow-y-auto py-6 space-y-6">
            {/* NFC 태그 위치 정보 표시 */}
            {taggedLocation && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 animate-fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="font-semibold text-blue-900">현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}</p>
                    <p className="text-blue-700 text-sm mt-1">
                      {locationInfo.isNearby && taggedLocation.room?.includes('원무')
                        ? '✅ 이곳이 접수창구입니다. 바로 접수하실 수 있습니다.'
                        : '📍 초진 접수는 본관 1층 원무과에서 하실 수 있습니다. 다음 화면에서 길찾기를 확인하세요.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                onClick={() => navigate('/voice-guide')}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 
                         hover:shadow-md transition-all duration-300 text-left group">
                <span className="text-3xl">🔊</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-2 
                             group-hover:text-blue-600 transition-colors">
                  음성 안내
                </h3>
                <p className="text-gray-600 text-sm mt-1">말로 물어보세요</p>
              </button>
            </div>

            {/* 문의 정보 */}
            <div className="text-center text-gray-600">
              <p>도움이 필요하신가요?</p>
              <p className="font-medium">원무과 ☎️ 02-1234-5678</p>
            </div>
          </div>

          {/* 슬라이드 2: 원무과 위치 및 지도 */}
          <div className="h-full overflow-y-auto py-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              초진 접수창구 위치
            </h2>

            {/* [NAVIGATION-COMPONENT] 지도 컴포넌트가 들어갈 자리 */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                [NAVIGATION-COMPONENT]
              </h3>
              <p className="text-gray-600 mb-4">
                초진 접수창구 길찾기 지도 컴포넌트가 여기에 표시됩니다
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

            {/* 접수창구 상세 정보 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                초진 접수 안내
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏢</span>
                  <div>
                    <p className="font-medium text-gray-900">본관 1층 원무과</p>
                    <p className="text-gray-600">정문 들어오셔서 우측</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium">필요한 서류</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-blue-700">
                    <li>• 신분증 (주민등록증, 운전면허증 등)</li>
                    <li>• 건강보험증</li>
                    <li>• 의뢰서 (타 병원에서 온 경우)</li>
                  </ul>
                </div>

                <button 
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg 
                             font-semibold hover:bg-blue-700 transition-colors duration-200
                             flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  간편 접수하기
                </button>
              </div>
            </div>
          </div>
        </SlideNavigation>
        </div>
      </div>
    </div>
  );
}