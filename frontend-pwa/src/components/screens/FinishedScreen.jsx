import React, { useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import { useNavigate } from 'react-router-dom';
// import SimpleProgressBar from '../journey/SimpleProgressBar';
import CompletedTaskCard from '../journey/CompletedTaskCard';
import UnifiedHeader from '../common/UnifiedHeader';

export default function FinishedScreen({ taggedLocation, completed_tasks }) {
  const { user, todaysAppointments } = useJourneyStore();
  const navigate = useNavigate();
  const [showSurvey, setShowSurvey] = useState(false);
  const [rating, setRating] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const completedCount = todaysAppointments?.filter(
    apt => apt.status === 'completed'
  ).length || 0;

  const handleSurveySubmit = () => {
    // 만족도 조사 제출 (추후 API 연동)
    console.log('Survey submitted:', rating);
    setShowSurvey(false);
  };

  // 슬라이드 컨텐츠 정의
  const slides = [
    { id: 'progress', title: '진행 상황' },
    { id: 'summary', title: '진료 요약' },
    { id: 'directions', title: '귀가 안내' },
    { id: 'actions', title: '추가 안내' },
    { id: 'survey', title: '만족도 조사' }
  ];

  const totalSlides = slides.length;
  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

  const goToPrevSlide = () => {
    if (canGoPrev) setCurrentSlide(currentSlide - 1);
  };

  const goToNextSlide = () => {
    if (canGoNext) setCurrentSlide(currentSlide + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 relative">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 통합 헤더 - 완료 상태 표시 */}
        <UnifiedHeader currentState="FINISHED" />
      </div>
      
      <div className="h-screen flex flex-col">

        {/* 슬라이드 타이틀 */}
        <div className="px-6 pt-8 pb-4">
          <div className="flex justify-center items-center gap-3">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlide(index)}
                className={`h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'w-12 bg-green-600' 
                    : 'w-3 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full flex transition-transform duration-500 ease-in-out"
               style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            
            {/* 슬라이드 1: 진행 상황 & 축하 메시지 */}
            <div className="w-full h-full flex-shrink-0 px-6 py-8 flex flex-col justify-center">
              <div className="text-center">
                <div className="mb-8 animate-bounce-slow">
                  <div className="w-56 h-56 mx-auto bg-gradient-to-br from-green-100 to-green-200 
                               rounded-full flex items-center justify-center shadow-2xl">
                    <span className="text-9xl">✅</span>
                  </div>
                </div>
                
                <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 
                             leading-tight">
                  모든 진료가<br/>
                  <span className="text-green-600 bg-green-100 px-6 py-3 rounded-3xl inline-block mt-3">
                    완료되었습니다
                  </span>
                </h1>
                <p className="text-3xl sm:text-4xl text-gray-700 font-semibold">
                  {user?.name}님, 수고하셨습니다
                </p>
              </div>
            </div>

            {/* 슬라이드 2: 진료 요약 */}
            <div className="w-full h-full flex-shrink-0 px-6 py-8 overflow-y-auto">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
                  오늘의 진료 요약
                </h2>
                
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 text-center 
                              shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <p className="text-2xl text-blue-700 mb-3 font-medium">완료된 검사</p>
                    <p className="text-6xl font-extrabold text-blue-900">{completedCount}건</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 text-center 
                              shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <p className="text-2xl text-green-700 mb-3 font-medium">소요 시간</p>
                    <p className="text-6xl font-extrabold text-green-900">2시간 30분</p>
                  </div>
                </div>
                
                {completed_tasks && completed_tasks.length > 0 ? (
                  <div className="space-y-5">
                    {completed_tasks.map((task, index) => (
                      <CompletedTaskCard key={task.appointment_id} appointment={task} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todaysAppointments?.filter(apt => apt.status === 'completed').map((apt, index) => (
                      <div key={apt.appointment_id} 
                           className="flex items-center gap-5 p-6 bg-gradient-to-r from-gray-50 to-gray-100 
                                    rounded-2xl hover:from-gray-100 hover:to-gray-200 
                                    transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02]">
                        <div className="w-14 h-14 bg-gradient-to-br from-green-200 to-green-300 rounded-full 
                                    flex items-center justify-center shadow-md">
                          <svg className="w-8 h-8 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" 
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                                  clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xl text-gray-800 font-semibold">{apt.exam?.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 슬라이드 3: 귀가 안내 */}
            <div className="w-full h-full flex-shrink-0 px-6 py-8 overflow-y-auto">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">
                  귀가 전 들르실 곳
                </h2>
                
                {taggedLocation && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 
                                rounded-3xl p-8 mb-8 shadow-xl">
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-200 to-purple-300 rounded-2xl 
                                  flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-3xl">📍</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-2xl font-bold text-gray-900 mb-3">
                          현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}
                        </p>
                        <p className="text-xl text-gray-700 leading-relaxed">
                          {(() => {
                            if (taggedLocation.room?.includes('원무') || taggedLocation.room?.includes('수납')) {
                              return '수납이 필요하신가요? 모든 검사가 완료되었으니 수납 후 귀가하시면 됩니다.';
                            } else if (taggedLocation.room?.includes('약국') || taggedLocation.room?.includes('처방')) {
                              return '처방전이 있으시다면 약국에서 약을 받아가세요.';
                            } else if (taggedLocation.room?.includes('주차') || taggedLocation.floor === '지하') {
                              return '주차장으로 가시는군요. 안전운전하세요!';
                            } else if (taggedLocation.room?.includes('검사') || taggedLocation.room?.includes('진료')) {
                              return `여기는 ${taggedLocation.room}입니다. 모든 진료가 완료되었으니 귀가하셔도 좋습니다.`;
                            } else {
                              return '모든 진료가 완료되었습니다. 필요하신 곳에 들르신 후 귀가하세요.';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-5">
                  <button className="w-full bg-white rounded-3xl p-8 shadow-lg 
                                 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300
                                 text-left group border-2 border-transparent hover:border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-200 to-blue-300 
                                    rounded-3xl flex items-center justify-center shadow-lg">
                          <span className="text-3xl">💳</span>
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-gray-900 mb-2">원무과</h4>
                          <p className="text-xl text-gray-700">본관 1층 중앙홀 좌측</p>
                        </div>
                      </div>
                      <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-600 
                                   group-hover:translate-x-2 transition-all duration-300" 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                  
                  <button className="w-full bg-white rounded-3xl p-8 shadow-lg 
                                 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300
                                 text-left group border-2 border-transparent hover:border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-200 to-green-300 
                                    rounded-3xl flex items-center justify-center shadow-lg">
                          <span className="text-3xl">💊</span>
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-gray-900 mb-2">약국</h4>
                          <p className="text-xl text-gray-700">본관 1층 원무과 옆</p>
                        </div>
                      </div>
                      <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-600 
                                   group-hover:translate-x-2 transition-all duration-300" 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                  
                  <button className="w-full bg-white rounded-3xl p-8 shadow-lg 
                                 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300
                                 text-left group border-2 border-transparent hover:border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-200 to-purple-300 
                                    rounded-3xl flex items-center justify-center shadow-lg">
                          <span className="text-3xl">🚗</span>
                        </div>
                        <div>
                          <h4 className="text-2xl font-bold text-gray-900 mb-2">주차장</h4>
                          <p className="text-xl text-gray-700">지하 1-3층 / 야외 주차장</p>
                        </div>
                      </div>
                      <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-600 
                                   group-hover:translate-x-2 transition-all duration-300" 
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* 슬라이드 4: 추가 안내 */}
            <div className="w-full h-full flex-shrink-0 px-6 py-8 flex flex-col justify-center">
              <div className="max-w-3xl mx-auto w-full">
                <h2 className="text-4xl font-bold text-gray-900 mb-10 text-center">
                  추가 안내 사항
                </h2>
                
                <div className="space-y-6">
                  <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white 
                                 rounded-3xl py-8 px-10 text-2xl font-bold shadow-2xl
                                 hover:shadow-3xl hover:from-blue-600 hover:to-blue-700 
                                 transform hover:scale-[1.03] transition-all duration-300
                                 flex items-center justify-center gap-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    진료 결과 확인 방법
                  </button>

                  <button className="w-full bg-white border-3 border-gray-300 text-gray-800 
                                 rounded-3xl py-8 px-10 text-2xl font-bold shadow-lg
                                 hover:shadow-2xl hover:border-gray-500 hover:bg-gray-50
                                 transform hover:scale-[1.03] transition-all duration-300
                                 flex items-center justify-center gap-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    다음 예약 확인하기
                  </button>
                  
                  <button 
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-100 text-gray-700 
                             rounded-3xl py-8 px-10 text-2xl font-bold shadow-md
                             hover:shadow-lg hover:bg-gray-200
                             transform hover:scale-[1.02] transition-all duration-300
                             flex items-center justify-center gap-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    처음 화면으로
                  </button>
                </div>
              </div>
            </div>

            {/* 슬라이드 5: 만족도 조사 */}
            <div className="w-full h-full flex-shrink-0 px-6 py-8 flex flex-col justify-center">
              <div className="max-w-3xl mx-auto w-full">
                {!showSurvey ? (
                  <div className="text-center">
                    <div className="text-8xl mb-8">😊</div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-6">
                      오늘 방문은 어떠셨나요?
                    </h3>
                    <p className="text-2xl text-gray-700 mb-10">
                      더 나은 서비스를 위해 의견을 들려주세요
                    </p>
                    <button 
                      onClick={() => setShowSurvey(true)}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white 
                               px-12 py-6 rounded-3xl text-2xl font-bold shadow-xl
                               hover:shadow-2xl hover:from-yellow-600 hover:to-orange-600 
                               transform hover:scale-[1.05] transition-all duration-300">
                      만족도 평가하기
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-4xl font-bold text-gray-900 mb-10 text-center">
                      만족도를 평가해주세요
                    </h3>
                    <div className="flex justify-center gap-6 mb-12">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="text-7xl transition-all duration-300 
                                   hover:scale-125 active:scale-110"
                        >
                          {rating >= star ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={handleSurveySubmit}
                      disabled={rating === 0}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white 
                               rounded-3xl py-8 text-2xl font-bold shadow-xl
                               hover:shadow-2xl hover:from-blue-600 hover:to-blue-700 
                               transform hover:scale-[1.03] transition-all duration-300
                               disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed">
                      평가 제출하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 네비게이션 버튼 */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <button 
              onClick={goToPrevSlide}
              disabled={!canGoPrev}
              className={`p-6 rounded-full shadow-lg transition-all duration-300 
                       ${canGoPrev 
                         ? 'bg-white hover:bg-gray-100 hover:shadow-xl transform hover:scale-110' 
                         : 'bg-gray-200 opacity-50 cursor-not-allowed'}`}>
              <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                      d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-xl font-semibold text-gray-700">
              {currentSlide + 1} / {totalSlides}
            </div>
            
            <button 
              onClick={goToNextSlide}
              disabled={!canGoNext}
              className={`p-6 rounded-full shadow-lg transition-all duration-300 
                       ${canGoNext 
                         ? 'bg-green-600 hover:bg-green-700 hover:shadow-xl transform hover:scale-110' 
                         : 'bg-gray-200 opacity-50 cursor-not-allowed'}`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                      d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}