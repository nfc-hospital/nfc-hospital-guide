import React, { useEffect } from 'react';
import useJourneyStore from '../../store/journeyStore';
import useMapStore from '../../store/mapStore';
import FormatATemplate from '../templates/FormatATemplate';

export default function PaymentScreen({ taggedLocation }) {
  // Store에서 필요한 데이터 가져오기 (구조 분해 사용)
  const { 
    user, 
    patientState,
    getTodaysScheduleForUI,
    getCompletionStats,
    getWaitingInfo
  } = useJourneyStore();
  
  // mapStore에서 경로 정보 가져오기
  const {
    activeRoute,
    navigationRoute
  } = useMapStore();
  
  // Store에서 계산된 상태 사용
  const todaySchedule = getTodaysScheduleForUI();
  const completionStats = getCompletionStats();
  const waitingInfo = getWaitingInfo();
  
  // 현재 단계 계산 - 수납 단계는 모든 검사 완료 후
  const currentStep = todaySchedule.length;
  
  
  const locationInfo = {
    name: '원무과 수납창구',
    building: '본관',
    floor: '1층',
    room: '중앙홀 우측',
    department: '원무과',
    directions: '엘리베이터로 1층 이동 후 오른쪽으로 가시면 됩니다',
    mapFile: 'main_1f.svg',
    svgId: 'payment-desk',
    mapId: 'main_1f',
    // 실제 백엔드 데이터 사용 (hospital_navigation)
    x_coord: 280, // 백엔드에서 원무과 수납창구 좌표 사용
    y_coord: 250,
    // 현재 위치
    currentLocation: {
      x_coord: 200,
      y_coord: 300,
      building: '본관',
      floor: '1',
      room: '엘리베이터 홀'
    },
    // 실제 hospital_navigation 경로 데이터 사용
    pathNodes: activeRoute?.path_nodes || navigationRoute?.nodes || [],
    pathEdges: activeRoute?.path_edges || navigationRoute?.edges || []
  };
  
  // 수납 대기 정보 - store에서 계산된 값 사용
  const paymentInfo = waitingInfo || {
    peopleAhead: 0,
    estimatedTime: 5
  };

  return (
    <FormatATemplate
      screenType="payment"
      currentStep={currentStep}
      totalSteps={todaySchedule.length || 7}
      nextAction={null} // 자동 생성되도록 null 전달
      waitingInfo={paymentInfo}
      locationInfo={locationInfo}
      todaySchedule={todaySchedule}
      taggedLocation={taggedLocation}
      patientState={user?.state || patientState || 'PAYMENT'}
      currentExam={null} // 수납은 검사가 아니므로 null
    >
      {/* 추가 콘텐츠 영역 - 수납 안내 */}
      <div className="space-y-4">
        {/* 수납 절차 안내 - 상단 위치 */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            수납 절차 안내
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-700 text-white rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-lg text-gray-700 font-medium">대기번호표를 받아주세요</p>
                <p className="text-sm text-gray-600 mt-1">원무과 입구에서 번호표를 뽑아주시기 바랍니다</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-700 text-white rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0">
                2
              </div>
              <div>
                <p className="text-lg text-gray-700 font-medium">호출 시 창구로 이동해주세요</p>
                <p className="text-sm text-gray-600 mt-1">화면과 음성으로 안내해드립니다</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-700 text-white rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0">
                3
              </div>
              <div>
                <p className="text-lg text-gray-700 font-medium">수납 후 영수증을 받아주세요</p>
                <p className="text-sm text-gray-600 mt-1">영수증은 꼭 보관해주시기 바랍니다</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 문의 정보 - 더 공손한 톤 */}
        <div className="bg-white rounded-2xl p-5 border-2 border-gray-300">
          <p className="text-base text-gray-700 mb-2">도움이 필요하시면 언제든지 문의해주세요</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">📞</span>
            <p className="text-xl font-bold text-gray-900">02-1234-5678</p>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">원무과 직통전화</p>
        </div>
      </div>
    </FormatATemplate>
  );
}