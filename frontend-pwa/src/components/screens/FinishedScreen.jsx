import React, { useState } from 'react';
import useJourneyStore from '../../store/journeyStore';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';

// 축하 애니메이션 데이터
const celebrationAnimation = {
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 180,
  w: 300,
  h: 300,
  nm: "Celebration",
  ddd: 0,
  assets: [],
  layers: [{
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: "Confetti",
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 1, k: [
        { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] },
        { t: 179, s: [360] }
      ] },
      p: { a: 0, k: [150, 150, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }
    },
    shapes: [{
      ty: "gr",
      it: [
        {
          d: 1,
          ty: "el",
          s: { a: 0, k: [10, 10] },
          p: { a: 1, k: [
            { i: { x: 0.833, y: 0.833 }, o: { x: 0.167, y: 0.167 }, t: 0, s: [0, -100], to: [0, 50], ti: [0, -50] },
            { t: 180, s: [0, 200] }
          ] }
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.945, 0.341, 0.553, 1] },
          o: { a: 0, k: 100 }
        }
      ]
    }]
  }]
};

export default function FinishedScreen({ taggedLocation }) {
  const { user, todaysAppointments } = useJourneyStore();
  const navigate = useNavigate();
  const [showSurvey, setShowSurvey] = useState(false);
  const [rating, setRating] = useState(0);
  
  const completedCount = todaysAppointments?.filter(
    apt => apt.status === 'completed'
  ).length || 0;

  const handleSurveySubmit = () => {
    // 만족도 조사 제출 (추후 API 연동)
    console.log('Survey submitted:', rating);
    setShowSurvey(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 축하 애니메이션 */}
        <div className="text-center mb-8">
          <Lottie 
            animationData={celebrationAnimation} 
            loop={true}
            style={{ width: 200, height: 200, margin: '0 auto' }}
          />
          
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            모든 진료가 완료되었습니다! 🎉
          </h1>
          <p className="text-xl text-gray-700">
            {user?.name}님, 오늘 수고하셨습니다
          </p>
        </div>

        {/* NFC 태그 위치에 따른 맞춤형 안내 */}
        {taggedLocation && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6 animate-fade-in">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <p className="font-semibold text-purple-900">
                  현재 위치: {taggedLocation.building} {taggedLocation.floor}층 {taggedLocation.room}
                </p>
                {(() => {
                  // 특정 위치에 따른 안내
                  if (taggedLocation.room?.includes('원무') || taggedLocation.room?.includes('수납')) {
                    return (
                      <p className="text-purple-700 mt-1">
                        💳 수납이 필요하신가요? 모든 검사가 완료되었으니 수납 후 귀가하시면 됩니다.
                      </p>
                    );
                  } else if (taggedLocation.room?.includes('약국') || taggedLocation.room?.includes('처방')) {
                    return (
                      <p className="text-purple-700 mt-1">
                        💊 처방전이 있으시다면 약국에서 약을 받아가세요.
                      </p>
                    );
                  } else if (taggedLocation.room?.includes('주차') || taggedLocation.floor === '지하') {
                    return (
                      <p className="text-purple-700 mt-1">
                        🚗 주차장으로 가시는군요. 안전운전하세요!
                      </p>
                    );
                  } else if (taggedLocation.room?.includes('검사') || taggedLocation.room?.includes('진료')) {
                    return (
                      <p className="text-purple-700 mt-1">
                        ✅ 여기는 {taggedLocation.room}입니다. 모든 진료가 완료되었으니 귀가하셔도 좋습니다.
                      </p>
                    );
                  } else {
                    return (
                      <p className="text-purple-700 mt-1">
                        🏠 모든 진료가 완료되었습니다. 필요하신 곳에 들르신 후 귀가하세요.
                      </p>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 오늘의 진료 요약 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            오늘의 진료 요약
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-600">완료된 검사</p>
              <p className="text-3xl font-bold text-blue-800">{completedCount}건</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-sm text-green-600">소요 시간</p>
              <p className="text-3xl font-bold text-green-800">2시간 30분</p>
            </div>
          </div>

          <div className="space-y-2">
            {todaysAppointments?.filter(apt => apt.status === 'completed').map(apt => (
              <div key={apt.appointment_id} 
                   className="flex items-center gap-2 text-gray-700 p-2 bg-gray-50 rounded-lg">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" 
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                        clipRule="evenodd" />
                </svg>
                <span>{apt.exam?.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 귀가 동선 안내 카드 추가 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🚶‍♂️</span>
            귀가 전 들르실 곳
          </h3>
          
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">💳</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">원무과</h4>
                    <p className="text-sm text-gray-600">본관 1층 중앙홀 좌측</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // TODO: [NAVIGATION-API] 원무과 길안내 API 연동 필요
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">💊</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">약국</h4>
                    <p className="text-sm text-gray-600">본관 1층 원무과 옆</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // TODO: [NAVIGATION-API] 약국 길안내 API 연동 필요
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">🚗</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">주차장</h4>
                    <p className="text-sm text-gray-600">지하 1-3층 / 야외 주차장</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // TODO: [NAVIGATION-API] 주차장 길안내 API 연동 필요
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800 flex items-start gap-2">
              <span>💡</span>
              <span>수납이 필요한 경우 원무과에서 수납 후 약국에서 처방약을 받아가세요.</span>
            </p>
          </div>
        </div>

        {/* 다음 단계 안내 */}
        <div className="space-y-4 mb-6">
          <button className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg 
                         font-semibold hover:bg-blue-700 transition-colors duration-200
                         flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            진료 결과 확인 방법 안내
          </button>

          <button className="w-full bg-green-600 text-white rounded-xl py-4 text-lg 
                         font-semibold hover:bg-green-700 transition-colors duration-200
                         flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            처방전 발급 안내
          </button>

          <button className="w-full bg-purple-600 text-white rounded-xl py-4 text-lg 
                         font-semibold hover:bg-purple-700 transition-colors duration-200
                         flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            다음 예약 메모하기
          </button>
        </div>

        {/* 만족도 조사 */}
        {!showSurvey ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">
                  오늘 방문은 어떠셨나요?
                </h3>
                <p className="text-yellow-800 text-sm mt-1">
                  간단한 만족도 조사에 참여해주세요 (선택사항)
                </p>
              </div>
              <button 
                onClick={() => setShowSurvey(true)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg
                         hover:bg-yellow-700 transition-colors duration-200">
                참여하기
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              만족도를 평가해주세요
            </h3>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  {rating >= star ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <button 
              onClick={handleSurveySubmit}
              disabled={rating === 0}
              className="w-full bg-blue-600 text-white rounded-xl py-3
                       font-medium hover:bg-blue-700 transition-colors duration-200
                       disabled:bg-gray-300 disabled:cursor-not-allowed">
              평가 제출하기
            </button>
          </div>
        )}

        {/* 귀가 안내 */}
        <div className="bg-gray-100 rounded-2xl p-6 text-center">
          <p className="text-gray-700 mb-4">
            안전하게 귀가하세요 😊
          </p>
          <button 
            onClick={() => navigate('/')}
            className="text-blue-600 font-medium hover:text-blue-800">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}